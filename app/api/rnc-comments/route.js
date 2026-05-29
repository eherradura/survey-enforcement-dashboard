export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORM_ID = "241300815293045";

const FIELD_LABELS = {
  submissionDate: "Submission Date",
  facilityName: "Facility Name:",
  rnc: "RNC:",
  significantEventComment:
    "Resource Nurse Consultant Comments - Reportable / Significant Event",
};

function normalizeLabel(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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

function findQuestionIdByLabel(questions, targetLabel) {
  const normalizedTarget = normalizeLabel(targetLabel);

  const match = Object.entries(questions || {}).find(([, question]) => {
    const questionText = normalizeLabel(question.text);
    const questionName = normalizeLabel(question.name);

    return questionText === normalizedTarget || questionName === normalizedTarget;
  });

  return match ? match[0] : null;
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

    const questionsUrl = `https://api.jotform.com/form/${FORM_ID}/questions`;
    const questionsData = await fetchJotformJson(questionsUrl);

    if (questionsData.responseCode !== 200) {
      return Response.json(
        {
          success: false,
          error: "Unable to retrieve Jotform questions.",
          details: questionsData,
        },
        { status: 502 }
      );
    }

    const questions = questionsData.content || {};

    const fieldIds = {
      submissionDate: findQuestionIdByLabel(
        questions,
        FIELD_LABELS.submissionDate
      ),
      facilityName: findQuestionIdByLabel(questions, FIELD_LABELS.facilityName),
      rnc: findQuestionIdByLabel(questions, FIELD_LABELS.rnc),
      significantEventComment: findQuestionIdByLabel(
        questions,
        FIELD_LABELS.significantEventComment
      ),
    };

    const missingFields = Object.entries(fieldIds)
      .filter(([, id]) => !id)
      .map(([key]) => ({
        key,
        expectedLabel: FIELD_LABELS[key],
      }));

    if (missingFields.length > 0) {
      return Response.json(
        {
          success: false,
          error: "One or more required safe fields were not found.",
          missingFields,
          availableQuestions: Object.entries(questions).map(([id, q]) => ({
            id,
            name: q.name || "",
            text: q.text || "",
            type: q.type || "",
          })),
        },
        { status: 404 }
      );
    }

    const submissionsUrl = `https://api.jotform.com/form/${FORM_ID}/submissions?limit=1000&orderby=created_at`;
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

        const submissionDate =
          normalizeAnswer(answers[fieldIds.submissionDate]) ||
          submission.created_at ||
          "";

        const facilityName = normalizeAnswer(answers[fieldIds.facilityName]);
        const rnc = normalizeAnswer(answers[fieldIds.rnc]);
        const comment = normalizeAnswer(
          answers[fieldIds.significantEventComment]
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
        return (
          String(item.comment || "").trim() !== "" ||
          String(item.facilityName || "").trim() !== ""
        );
      });

    return Response.json({
      success: true,
      formId: FORM_ID,
      pulledFieldsOnly: FIELD_LABELS,
      fieldIds,
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
