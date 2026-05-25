export const runtime = "nodejs";

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

function addDeficiency(deficienciesByFtag, ftag, scopeSeverity) {
  if (!ftag || ftag === "F000") return;

  const cleanSeverity = scopeSeverity
    ? String(scopeSeverity).trim().toUpperCase()
    : null;

  if (!cleanSeverity || !/^[A-L]$/.test(cleanSeverity)) return;

  const existing = deficienciesByFtag.get(ftag);

  if (
    !existing ||
    severityRank(cleanSeverity) > severityRank(existing.scopeSeverity)
  ) {
    deficienciesByFtag.set(ftag, {
      ftag,
      scopeSeverity: cleanSeverity,
    });
  }
}

function extractDeficiencies(text) {
  const normalized = normalizeText(text);
  const flattened = normalized.replace(/\n/g, " ");

  const deficienciesByFtag = new Map();

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Pattern 1: F689 ... SS=E or SS: E nearby
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ftagMatches = [...line.matchAll(/\bF\s*0?(\d{3})\b/gi)];

    for (const ftagMatch of ftagMatches) {
      const ftag = normalizeFtag(ftagMatch[1]);

      if (ftag === "F000") continue;

      const nearbyText = lines.slice(i, i + 20).join(" ");

      const ssMatch =
        nearbyText.match(/\bSS\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bS\/S\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bScope\s*\/?\s*Severity\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bScope\s+and\s+Severity\s*[:=]?\s*([A-L])\b/i);

      if (ssMatch) {
        addDeficiency(deficienciesByFtag, ftag, ssMatch[1]);
      }
    }
  }

  // Pattern 2: compact same-block F689 ... SS E
  const compactPatterns = [
    /\bF\s*0?(\d{3})\b.{0,260}?\b(?:SS|S\/S)\s*[:=]?\s*([A-L])\b/gi,
    /\b(?:SS|S\/S)\s*[:=]?\s*([A-L])\b.{0,260}?\bF\s*0?(\d{3})\b/gi,
    /\bF\s*0?(\d{3})\b.{0,260}?\bScope\s*\/?\s*Severity\s*[:=]?\s*([A-L])\b/gi,
  ];

  for (const pattern of compactPatterns) {
    for (const match of flattened.matchAll(pattern)) {
      let ftag;
      let severity;

      if (String(match[0]).match(/^\s*(SS|S\/S)/i)) {
        severity = match[1];
        ftag = normalizeFtag(match[2]);
      } else {
        ftag = normalizeFtag(match[1]);
        severity = match[2];
      }

      addDeficiency(deficienciesByFtag, ftag, severity);
    }
  }

  // Pattern 3: CMS 2567 table style often OCRs like:
  // F 0689 D or F689 E
  // This catches tags immediately followed by a severity letter.
  const directFtagSeverityPattern = /\bF\s*0?(\d{3})\s+([A-L])\b/gi;

  for (const match of flattened.matchAll(directFtagSeverityPattern)) {
    const ftag = normalizeFtag(match[1]);
    const severity = match[2];

    addDeficiency(deficienciesByFtag, ftag, severity);
  }

  // Pattern 4: OCR sometimes reads "F689 - E" or "F689 E"
  const dashPattern = /\bF\s*0?(\d{3})\s*[-–—]\s*([A-L])\b/gi;

  for (const match of flattened.matchAll(dashPattern)) {
    const ftag = normalizeFtag(match[1]);
    const severity = match[2];

    addDeficiency(deficienciesByFtag, ftag, severity);
  }

  // Pattern 5: CMS deficiency block often contains citation text:
  // F 0689 Free of Accident Hazards/Supervision/Devices
  // ... Scope/Severity: E
  // This broader window helps when OCR inserts a lot of wording.
  const broadBlockPattern =
    /\bF\s*0?(\d{3})\b(?:(?!\bF\s*0?\d{3}\b).){0,1200}?\b(?:SS|S\/S|Scope\s*\/?\s*Severity|Scope\s+and\s+Severity)\s*[:=]?\s*([A-L])\b/gi;

  for (const match of flattened.matchAll(broadBlockPattern)) {
    const ftag = normalizeFtag(match[1]);
    const severity = match[2];

    addDeficiency(deficienciesByFtag, ftag, severity);
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

export async function POST(request) {
  try {
    const { fileId, submissionId, facility, surveyType } = await request.json();

    const driveConnectorUrl = process.env.DRIVE_CONNECTOR_URL;

    if (!fileId) {
      return Response.json({
        success: false,
        error: "Missing fileId",
      });
    }

    if (!driveConnectorUrl) {
      return Response.json({
        success: false,
        error: "Missing DRIVE_CONNECTOR_URL",
      });
    }

    const ocrResponse = await fetch(
      `${driveConnectorUrl}?action=ocrText&fileId=${encodeURIComponent(fileId)}`,
      { cache: "no-store" }
    );

    const ocrData = await ocrResponse.json();

    if (!ocrData.success) {
      return Response.json({
        success: false,
        error: "Google Drive OCR failed",
        ocrData,
      });
    }

    const text = normalizeText(ocrData.text || "");
    const deficiencies = extractDeficiencies(text);
    const intakeNumberFromPdf = extractIntakeNumber(ocrData.fileName, text);
    const dates = extractSurveyDates(text);
    const severitySummary = buildSeveritySummary(deficiencies);

    const parsedResult = {
      success: true,
      fileName: ocrData.fileName,
      fileId,
      submissionId: submissionId || "",
      facility: facility || "",
      surveyType: surveyType || "",
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
    };

    const saveResult = await saveAnalysisToSheet({
      driveConnectorUrl,
      submissionId: submissionId || "",
      fileId,
      fileName: ocrData.fileName || "",
      facility: facility || "",
      surveyType: surveyType || "",
      intakeNumberFromPdf,
      deficiencies,
      parsedResult,
    });

    return Response.json({
      ...parsedResult,
      savedToSheet: saveResult?.success === true,
      saveResult,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
