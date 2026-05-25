export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_LIMIT = 5;

function normalizeText(text) {
  return (text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeFtag(rawNumber) {
  const digits = String(rawNumber || "").replace(/\D/g, "");
  const normalized = digits.slice(-3);
  return `F${normalized}`;
}

function severityRank(letter) {
  const order = {
    L: 12,
    K: 11,
    J: 10,
    I: 9,
    H: 8,
    G: 7,
    F: 6,
    E: 5,
    D: 4,
    C: 3,
    B: 2,
    A: 1,
  };

  return order[String(letter || "").toUpperCase()] || 0;
}

function isAnnualOrRecertification(fileName, text) {
  const combined = `${fileName || ""} ${text || ""}`;

  return /annual survey|recertification|re certification|standard survey|standard recertification/i.test(
    combined
  );
}

function extractIntakeNumber(fileName, text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (isAnnualOrRecertification(fileName, cleanText)) {
    return "Recertification";
  }

  const intakeMatch =
    cleanText.match(/intake\s*(number|#)?\s*[:#]?\s*([A-Z]{1,5}\d{4,})/i) ||
    cleanText.match(/\bCA\d{4,}\b/i);

  if (!intakeMatch) {
    return null;
  }

  return intakeMatch[2] || intakeMatch[0];
}

function extractDeficiencies(text) {
  const normalized = normalizeText(text);

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const deficienciesByFtag = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const ftagMatches = [...line.matchAll(/\bF\s*0?(\d{3})\b/gi)];

    for (const ftagMatch of ftagMatches) {
      const ftag = normalizeFtag(ftagMatch[1]);

      if (ftag === "F000") {
        continue;
      }

      const nearbyText = lines.slice(i, i + 14).join(" ");

      const ssMatch =
        nearbyText.match(/\bSS\s*[:=]\s*([A-L])\b/i) ||
        nearbyText.match(/\bS\/S\s*[:=]\s*([A-L])\b/i) ||
        nearbyText.match(/\bScope\s*\/?\s*Severity\s*[:=]\s*([A-L])\b/i);

      const scopeSeverity = ssMatch ? ssMatch[1].toUpperCase() : null;

      if (!scopeSeverity) {
        continue;
      }

      const existing = deficienciesByFtag.get(ftag);

      if (
        !existing ||
        severityRank(scopeSeverity) > severityRank(existing.scopeSeverity)
      ) {
        deficienciesByFtag.set(ftag, {
          ftag,
          scopeSeverity,
        });
      }
    }
  }

  const flattened = normalized.replace(/\n/g, " ");

  const compactPattern =
    /\bF\s*0?(\d{3})\b.{0,180}?\b(?:SS|S\/S)\s*[:=]\s*([A-L])\b/gi;

  for (const match of flattened.matchAll(compactPattern)) {
    const ftag = normalizeFtag(match[1]);

    if (ftag === "F000") {
      continue;
    }

    const scopeSeverity = match[2].toUpperCase();

    const existing = deficienciesByFtag.get(ftag);

    if (
      !existing ||
      severityRank(scopeSeverity) > severityRank(existing.scopeSeverity)
    ) {
      deficienciesByFtag.set(ftag, {
        ftag,
        scopeSeverity,
      });
    }
  }

  const deficiencies = [...deficienciesByFtag.values()];

  deficiencies.sort((a, b) => {
    const severityDifference =
      severityRank(b.scopeSeverity) - severityRank(a.scopeSeverity);

    if (severityDifference !== 0) {
      return severityDifference;
    }

    const aNumber = Number(a.ftag.replace("F", ""));
    const bNumber = Number(b.ftag.replace("F", ""));

    return aNumber - bNumber;
  });

  return deficiencies;
}

function extractSurveyDates(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  const dateSurveyCompleted =
    cleanText.match(/DATE SURVEY COMPLETED\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    cleanText.match(
      /\(X3\)\s*DATE SURVEY COMPLETED\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    );

  const surveyRange =
    cleanText.match(
      /survey conducted on\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*to\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    ) ||
    cleanText.match(
      /conducted on\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*to\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    );

  return {
    surveyCompletedDate: dateSurveyCompleted ? dateSurveyCompleted[1] : null,
    surveyStartDate: surveyRange ? surveyRange[1] : null,
    surveyEndDate: surveyRange ? surveyRange[2] : null,
  };
}

function buildSeveritySummary(deficiencies) {
  const summary = {};

  deficiencies.forEach((item) => {
    const severity = item.scopeSeverity || "Unknown";
    summary[severity] = (summary[severity] || 0) + 1;
  });

  const severityOrder = [
    "L",
    "K",
    "J",
    "I",
    "H",
    "G",
    "F",
    "E",
    "D",
    "C",
    "B",
    "A",
    "Unknown",
  ];

  return severityOrder
    .filter((severity) => summary[severity])
    .map((severity) => `${severity}: ${summary[severity]}`)
    .join(" • ");
}

function isJotformSubmissionPdf(file, submissionId) {
  const name = (file.name || "").toLowerCase().trim();

  if (name === `${submissionId}.pdf`.toLowerCase()) return true;
  if (/^\d+\.pdf$/i.test(name)) return true;

  return false;
}

function isRelevantRegulatoryDocument(file, submissionId) {
  if (!file?.name) return false;
  if (isJotformSubmissionPdf(file, submissionId)) return false;

  const name = file.name.toLowerCase();

  return (
    name.includes("2567") ||
    name.includes("cover") ||
    name.includes("letter") ||
    name.includes("annual") ||
    name.includes("survey") ||
    name.includes("life safety") ||
    name.includes("enforcement") ||
    name.includes("deficiency") ||
    name.includes("poc")
  );
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
  });

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: "Could not parse JSON response",
      rawResponse: text.slice(0, 1000),
    };
  }
}

async function saveAnalysisToSheet({
  driveConnectorUrl,
  submissionId,
  fileId,
  fileName,
  facility,
  surveyType,
  intakeNumberFromPdf,
  deficiencies,
  parsedResult,
}) {
  const saveResponse = await fetch(driveConnectorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "saveAnalysis",
      submissionId,
      fileId,
      fileName,
      facility,
      surveyType,
      intakeNumberFromPdf,
      deficiencies,
      rawJson: parsedResult,
    }),
  });

  const saveText = await saveResponse.text();

  try {
    return JSON.parse(saveText);
  } catch {
    return {
      success: false,
      error: "Could not parse save response",
      rawResponse: saveText.slice(0, 1000),
    };
  }
}

function getAnswer(answers, id) {
  const field = answers?.[id];

  if (!field) return "";

  if (field.prettyFormat) return field.prettyFormat;

  if (field.options_array && field.answer) {
    try {
      const options = JSON.parse(field.options_array);
      const selectedKey = String(field.answer)
        .replace("{", "")
        .replace("}", "");

      return options[selectedKey]?.value || field.answer;
    } catch {
      return field.answer || "";
    }
  }

  return field.answer || "";
}

function buildSubmissionLookup(jotformSubmissions) {
  const lookup = {};

  jotformSubmissions.forEach((submission) => {
    lookup[String(submission.id)] = submission;
  });

  return lookup;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedLimit = Number(body.limit || BATCH_LIMIT);
    const limit = Math.min(Math.max(requestedLimit, 1), 10);

    const driveConnectorUrl = process.env.DRIVE_CONNECTOR_URL;

    if (!driveConnectorUrl) {
      return Response.json({
        success: false,
        error: "Missing DRIVE_CONNECTOR_URL",
      });
    }

    const [driveData, savedAnalysisData, jotformData] = await Promise.all([
      fetchJson(driveConnectorUrl),
      fetchJson(`${driveConnectorUrl}?action=analysis`),
      fetchJson(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""}/api/jotform`).catch(
        () => null
      ),
    ]);

    let jotformSubmissions = [];

    if (jotformData?.content) {
      jotformSubmissions = jotformData.content;
    } else {
      const fallbackJotformResponse = await fetch(
        `${body.origin || ""}/api/jotform`,
        { cache: "no-store" }
      ).catch(() => null);

      if (fallbackJotformResponse) {
        const fallbackJotformText = await fallbackJotformResponse.text();

        try {
          const fallbackJson = JSON.parse(fallbackJotformText);
          jotformSubmissions = fallbackJson.content || [];
        } catch {
          jotformSubmissions = [];
        }
      }
    }

    if (!driveData.success) {
      return Response.json({
        success: false,
        error: "Could not load Drive documents",
        driveData,
      });
    }

    if (!savedAnalysisData.success) {
      return Response.json({
        success: false,
        error: "Could not load saved analysis",
        savedAnalysisData,
      });
    }

    const savedKeys = new Set(
      (savedAnalysisData.analysis || []).map((record) => {
        return `${String(record.submissionId || "")}-${String(record.fileId || "")}`;
      })
    );

    const submissionLookup = buildSubmissionLookup(jotformSubmissions);

    const pendingDocuments = [];

    (driveData.submissions || []).forEach((folder) => {
      const submissionId = String(folder.submissionId || "");
      const files = folder.files || [];

      files.forEach((file) => {
        if (!isRelevantRegulatoryDocument(file, submissionId)) return;

        const key = `${submissionId}-${file.fileId}`;

        if (savedKeys.has(key)) return;

        const jotformSubmission = submissionLookup[submissionId];
        const answers = jotformSubmission?.answers || {};

        pendingDocuments.push({
          submissionId,
          fileId: file.fileId,
          fileName: file.name || "",
          facility: getAnswer(answers, "3"),
          surveyType: getAnswer(answers, "4"),
        });
      });
    });

    const batch = pendingDocuments.slice(0, limit);

    const processed = [];
    const failed = [];

    for (const item of batch) {
      try {
        const ocrData = await fetchJson(
          `${driveConnectorUrl}?action=ocrText&fileId=${encodeURIComponent(
            item.fileId
          )}`
        );

        if (!ocrData.success) {
          failed.push({
            ...item,
            error: "Google Drive OCR failed",
            details: ocrData,
          });
          continue;
        }

        const text = normalizeText(ocrData.text || "");
        const deficiencies = extractDeficiencies(text);
        const intakeNumberFromPdf = extractIntakeNumber(ocrData.fileName, text);
        const dates = extractSurveyDates(text);
        const severitySummary = buildSeveritySummary(deficiencies);

        const parsedResult = {
          success: true,
          fileName: ocrData.fileName || item.fileName,
          fileId: item.fileId,
          submissionId: item.submissionId,
          facility: item.facility || "",
          surveyType: item.surveyType || "",
          intakeNumberFromPdf,
          deficienciesFound: deficiencies.length > 0,
          deficiencies,
          ftags: deficiencies.map((d) => `${d.ftag} - ${d.scopeSeverity}`),
          scopeSeverity: deficiencies.map((d) => d.scopeSeverity),
          severitySummary,
          surveyCompletedDate: dates.surveyCompletedDate,
          surveyStartDate: dates.surveyStartDate,
          surveyEndDate: dates.surveyEndDate,
          textLength: text.length,
          ocrSource: "Google Drive OCR",
          savedAt: new Date().toISOString(),
          analyzedByBatchRoute: true,
        };

        const saveResult = await saveAnalysisToSheet({
          driveConnectorUrl,
          submissionId: item.submissionId,
          fileId: item.fileId,
          fileName: ocrData.fileName || item.fileName,
          facility: item.facility || "",
          surveyType: item.surveyType || "",
          intakeNumberFromPdf,
          deficiencies,
          parsedResult,
        });

        if (!saveResult.success) {
          failed.push({
            ...item,
            error: "Save to Google Sheet failed",
            saveResult,
          });
          continue;
        }

        processed.push({
          ...item,
          intakeNumberFromPdf,
          deficienciesFound: deficiencies.length > 0,
          deficiencyCount: deficiencies.length,
          severitySummary,
          saveResult,
        });
      } catch (error) {
        failed.push({
          ...item,
          error: error.message,
        });
      }
    }

    return Response.json({
      success: true,
      limit,
      totalRelevantDocuments:
        pendingDocuments.length + savedKeys.size,
      pendingBeforeRun: pendingDocuments.length,
      processedCount: processed.length,
      failedCount: failed.length,
      remainingAfterRun: Math.max(pendingDocuments.length - processed.length, 0),
      processed,
      failed,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
