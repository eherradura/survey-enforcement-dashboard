export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOTFORM_API_BASE = "https://hipaa-api.jotform.com";
const FORM_ID = "241300815293045";

// Hard-coded allowlist. These are the ONLY Jotform fields this route will return.
// 3  = Facility Name:
// 4  = Date
// 32 = RNC:
// 39 = Resource Nurse Consultant Comments - Reportable / Significant Event
const SAFE_FIELD_IDS = {
  facilityName: "3",
  date: "4",
  rnc: "32",
  significantEventComment: "39",
};

const NON_REPORTABLE_VALUES = new Set([
  "",
  "none",
  "n/a",
  "na",
  "n.a.",
  "no",
  "no reportable event",
  "no reportable events",
  "nothing",
  "nil",
]);

function normalizeAnswer(answer) {
  if (!answer) return "";

  if (typeof answer.answer === "string") return answer.answer;
  if (typeof answer.prettyFormat === "string") return answer.prettyFormat;

  if (Array.isArray(answer.answer)) {
    return answer.answer.join(", ");
  }

  if (answer.answer && typeof answer.answer === "object") {
    return Object.values(answer.answer).filter(Boolean).join(", ");
  }

  return "";
}

function normalizeDateAnswer(answer, fallbackDate = "") {
  if (!answer) return fallbackDate || "";

  if (typeof answer.prettyFormat === "string" && answer.prettyFormat.trim()) {
    return answer.prettyFormat.trim();
  }

  if (typeof answer.answer === "string" && answer.answer.trim()) {
    return answer.answer.trim();
  }

  if (answer.answer && typeof answer.answer === "object") {
    const values = answer.answer;

    const month =
      values.month ||
      values.mm ||
      values.Month ||
      values.MONTH ||
      "";

    const day =
      values.day ||
      values.dd ||
      values.Day ||
      values.DAY ||
      "";

    const year =
      values.year ||
      values.yyyy ||
      values.Year ||
      values.YEAR ||
      "";

    if (month && day && year) {
      return `${month}/${day}/${year}`;
    }

    const objectDateText = Object.values(values).filter(Boolean).join("/");

    if (objectDateText) {
      return objectDateText;
    }
  }

  return fallbackDate || "";
}

function normalizeTwoDigitYear(yearText) {
  const year = String(yearText || "").trim();

  if (year.length === 2) {
    const numericYear = Number(year);

    if (numericYear <= 79) return `20${year}`;
    return `19${year}`;
  }

  return year;
}

function getYearFromDateText(dateText) {
  const text = String(dateText || "");

  const fourDigitYear = text.match(/\b(20\d{2}|19\d{2})\b/);
  if (fourDigitYear) return fourDigitYear[1];

  const twoDigitYear = text.match(/\b\d{1,2}[/-]\d{1,2}[/-](\d{2})\b/);
  if (twoDigitYear) return normalizeTwoDigitYear(twoDigitYear[1]);

  return String(new Date().getFullYear());
}

function padDatePart(value) {
  return String(value || "").padStart(2, "0");
}

function extractDatesFromComment(comment, fallbackDate = "") {
  const text = String(comment || "").trim();

  if (!text) return [];

  const fallbackYear = getYearFromDateText(fallbackDate);

  // Supports:
  // 5/27
  // 05/27
  // 5/27/26
  // 05/27/2026
  // 5-27
  // 5-27-26
  const matches = Array.from(
    text.matchAll(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/g)
  );

  const dates = matches.map((match) => {
    const month = padDatePart(match[1]);
    const day = padDatePart(match[2]);
    const year = match[3]
      ? normalizeTwoDigitYear(match[3])
      : fallbackYear;

    return `${month}/${day}/${year}`;
  });

  return Array.from(new Set(dates));
}

function removeLeadingDateFromComment(comment) {
  const text = String(comment || "").trim();

  if (!text) return "";

  // Removes leading dates such as:
  // 5/27
  // 5/27/26
  // 05/27/2026
  // 5-27
  // 5-27-26
  return text
    .replace(/^\s*\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s*[-–—:]?\s*/i, "")
    .trim();
}

function isRealSignificantEventComment(comment) {
  const normalized = String(comment || "").trim().toLowerCase();
  return !NON_REPORTABLE_VALUES.has(normalized);
}

async function fetchJotformJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      APIKEY: process.env.JOTFORM_API_KEY || "",
    },
  });

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      responseCode: response.status,
      message: "Could not parse Jotform response",
      rawResponse: text.slice(0, 1000),
    };
  }
}

export async function GET() {
  try {
    const apiKey = process.env.JOTFORM_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          success: false,
          error: "Missing JOTFORM_API_KEY environment variable.",
        },
        { status: 500 }
      );
    }

    const submissionsUrl = `${JOTFORM_API_BASE}/form/${FORM_ID}/submissions?limit=1000&orderby=created_at`;
    const submissionsData = await fetchJotformJson(submissionsUrl);

    if (submissionsData.responseCode !== 200) {
      return Response.json(
        {
          success: false,
          error: "Unable to retrieve Jotform submissions.",
          details: submissionsData,
        },
        { status: 502 }
      );
    }

    const submissions = submissionsData.content || [];

    const significantEvents = submissions
      .map((submission) => {
        const answers = submission.answers || {};

        const facilityName = normalizeAnswer(
          answers[SAFE_FIELD_IDS.facilityName]
        );

        const formDate = normalizeDateAnswer(
          answers[SAFE_FIELD_IDS.date],
          submission.created_at || ""
        );

        const rnc = normalizeAnswer(answers[SAFE_FIELD_IDS.rnc]);

        const comment = normalizeAnswer(
          answers[SAFE_FIELD_IDS.significantEventComment]
        );

        const eventDatesFromComment = extractDatesFromComment(
          comment,
          formDate || submission.created_at || ""
        );

        const firstEventDateFromComment = eventDatesFromComment[0] || "";

        const displayComment = removeLeadingDateFromComment(comment);

        return {
          submissionId: submission.id,
          createdAt: submission.created_at || null,
          updatedAt: submission.updated_at || null,

          // Fallback date from the Jotform Date field.
          submissionDate: formDate || submission.created_at || "",

          // Primary date used by the dashboard for Significant Events.
          displayDate:
            firstEventDateFromComment ||
            formDate ||
            submission.created_at ||
            "",

          eventDateFromComment: firstEventDateFromComment,
          eventDatesFromComment,
          formDate,

          facilityName,
          rnc,

          // Original full cell value.
          comment,

          // Cleaned text shown on dashboard.
          displayComment,
        };
      })
      .filter((item) => {
        return isRealSignificantEventComment(item.comment);
      });

    return Response.json({
      success: true,
      formId: FORM_ID,
      apiBase: JOTFORM_API_BASE,
      pulledFieldsOnly: {
        facilityName: "Facility Name:",
        date: "Date",
        rnc: "RNC:",
        significantEventComment:
          "Resource Nurse Consultant Comments - Reportable / Significant Event",
      },
      fieldIds: SAFE_FIELD_IDS,
      dateLogic:
        "Significant Events use the first date found in the comment cell, including dates without a year. The leading date is removed from the displayed comment.",
      count: significantEvents.length,
      significantEvents,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message || "Unable to retrieve RNC significant events.",
      },
      { status: 500 }
    );
  }
}
