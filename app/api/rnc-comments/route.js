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

  // Primary source: the actual Date field inside the Jotform form.
  // Jotform Date field commonly returns prettyFormat like 05/27/2026.
  if (typeof answer.prettyFormat === "string" && answer.prettyFormat.trim()) {
    return answer.prettyFormat.trim();
  }

  // Sometimes Jotform returns the date as a direct string.
  if (typeof answer.answer === "string" && answer.answer.trim()) {
    return answer.answer.trim();
  }

  // Sometimes Jotform returns the date as an object.
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

    // Backup only if Jotform changes the date object structure.
    const objectDateText = Object.values(values)
      .filter(Boolean)
      .join("/");

    if (objectDateText) {
      return objectDateText;
    }
  }

  // Only use the form completion date if the actual Date field is blank.
  return fallbackDate || "";
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

        // IMPORTANT:
        // This uses the actual Date cell from the form first.
        // It only falls back to createdAt if the Date field is blank.
        const submissionDate = normalizeDateAnswer(
          answers[SAFE_FIELD_IDS.date],
          submission.created_at || ""
        );

        const rnc = normalizeAnswer(answers[SAFE_FIELD_IDS.rnc]);

        const comment = normalizeAnswer(
          answers[SAFE_FIELD_IDS.significantEventComment]
        );

        return {
          submissionId: submission.id,
          createdAt: submission.created_at || null,
          updatedAt: submission.updated_at || null,
          submissionDate,
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
