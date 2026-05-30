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

    // Assumes 00-79 means 2000s and 80-99 means 1900s.
    // For your dashboard, 26 becomes 2026.
    if (numericYear <= 79) return `20${year}`;
    return `19${year}`;
  }

  return year;
}

function padDatePart(value) {
  return String(value || "").padStart(2, "0");
}

function extractFirstDateFromComment(comment) {
  const text = String(comment || "").trim();

  if (!text) return "";

  // Finds dates like:
  // 5/28/26
  // 05/28/2026
  // 5-28-26
  // 05-28-2026
  const match = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);

  if (!match) return "";

  const month = padDatePart(match[1]);
  const day = padDatePart(match[2]);
  const year = normalizeTwoDigitYear(match[3]);

  return `${month}/${day}/${year}`;
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

        const eventDateFromComment = extractFirstDateFromComment(comment);

        // IMPORTANT:
        // The dashboard display/filter date should be the actual event date
        // found in the comment. If no date is found in the comment, then use
        // the Jotform Date field. If that is blank, use createdAt as fallback.
        const submissionDate =
          eventDateFromComment || formDate || submission.created_at || "";

        return {
          submissionId: submission.id,
          createdAt: submission.created_at || null,
          updatedAt: submission.updated_at || null,

          // This is now the display/filter date used by the dashboard.
          submissionDate,

          // These are kept for troubleshooting.
          eventDateFromComment,
          formDate,

          facilityName,
          rnc,
          comment,
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
        "submissionDate uses first date found in significant event comment, then Jotform Date field, then createdAt fallback.",
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
