export const runtime = "nodejs";
export const maxDuration = 60;

const PARSER_VERSION = "direct-pdf-v2-compact";

async function loadPdfParse() {
  const pdfParseModule = await import("pdf-parse");
  return pdfParseModule.default || pdfParseModule;
}

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

  if (!intakeMatch) return null;

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ftagMatches = [...line.matchAll(/\bF\s*0?(\d{3})\b/gi)];

    for (const ftagMatch of ftagMatches) {
      const ftag = normalizeFtag(ftagMatch[1]);

      if (ftag === "F000") continue;

      const nearbyText = lines.slice(i, i + 32).join(" ");

      const ssMatch =
        nearbyText.match(/\bSS\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bS\/S\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bScope\s*\/?\s*Severity\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bScope\s+and\s+Severity\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bSeverity\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bLevel\s*[:=]?\s*([A-L])\b/i);

      if (ssMatch) {
        addDeficiency(deficienciesByFtag, ftag, ssMatch[1]);
      }
    }
  }

  const patterns = [
    /\bF\s*0?(\d{3})\b.{0,700}?\b(?:SS|S\/S)\s*[:=]?\s*([A-L])\b/gi,
    /\b(?:SS|S\/S)\s*[:=]?\s*([A-L])\b.{0,700}?\bF\s*0?(\d{3})\b/gi,
    /\bF\s*0?(\d{3})\b.{0,700}?\bScope\s*\/?\s*Severity\s*[:=]?\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\b.{0,700}?\bSeverity\s*[:=]?\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\b.{0,700}?\bLevel\s*[:=]?\s*([A-L])\b/gi,
    /\bTag\s*[:#]?\s*F?\s*0?(\d{3})\b.{0,1000}?\b(?:Scope\s*\/?\s*Severity|Severity|SS|S\/S|Level)\s*[:=]?\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\s+([A-L])\b/gi,
    /\bF\s*0?(\d{3})\s*[-–—]\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\b(?:(?!\bF\s*0?\d{3}\b).){0,2200}?\b(?:SS|S\/S|Scope\s*\/?\s*Severity|Scope\s+and\s+Severity|Severity|Level)\s*[:=]?\s*([A-L])\b/gi,
  ];

  for (const pattern of patterns) {
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

  const deficiencies = [...deficienciesByFtag.values()];

  deficiencies.sort((a, b) => {
    const severityDifference =
      severityRank(b.scopeSeverity) - severityRank(a.scopeSeverity);

    if (severityDifference !== 0) return severityDifference;

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

function detectCoverLetterDeficiencyIndication(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  const mentionsDeficiencies =
    /this survey found the most serious deficiency|deficiencies cited during this survey|poc for the deficiencies|statement of deficiencies|cms.?2567/i.test(
      cleanText
    );

  const highestSeverityMatch =
    cleanText.match(
      /pattern of deficiencies that constitute no actual harm.*?\(([A-L])\)/i
    ) ||
    cleanText.match(
      /isolated deficiencies that constitute no actual harm.*?\(([A-L])\)/i
    ) ||
    cleanText.match(/immediate jeopardy.*?\(([A-L])\)/i);

  return {
    coverLetterIndicatesDeficiencies: mentionsDeficiencies,
    coverLetterHighestSeverity: highestSeverityMatch
      ? highestSeverityMatch[1].toUpperCase()
      : null,
  };
}

function buildCompactDebug(text, directResult, ocrResult, selectedTextSource) {
  const normalized = normalizeText(text);
  const flattened = normalized.replace(/\n/g, " ");

  const firstFtagMatch = flattened.match(/\bF\s*0?\d{3}\b/i);
  const firstCfrMatch = flattened.match(/\b483\.\d+/i);

  const tagSnippets = [];
  const patterns = [
    /\bF\s*0?\d{3}\b/gi,
    /\bSS\s*[:=]?\s*[A-L]\b/gi,
    /\bS\/S\s*[:=]?\s*[A-L]\b/gi,
    /\bScope\s*\/?\s*Severity\b/gi,
    /\b483\.\d+/gi,
  ];

  for (const pattern of patterns) {
    for (const match of flattened.matchAll(pattern)) {
      const start = Math.max(match.index - 250, 0);
      const end = Math.min(match.index + 450, flattened.length);

      tagSnippets.push({
        match: match[0],
        snippet: flattened.slice(start, end),
      });

      if (tagSnippets.length >= 20) break;
    }

    if (tagSnippets.length >= 20) break;
  }

  return {
    parserVersion: PARSER_VERSION,
    selectedTextSource: {
      source: selectedTextSource.source,
      selectionReason: selectedTextSource.selectionReason,
      directTextLength: selectedTextSource.directTextLength,
      ocrTextLength: selectedTextSource.ocrTextLength,
      directHasFtags: selectedTextSource.directHasFtags,
      ocrHasFtags: selectedTextSource.ocrHasFtags,
      directHasCfr: selectedTextSource.directHasCfr,
      ocrHasCfr: selectedTextSource.ocrHasCfr,
      directPageCount: selectedTextSource.directPageCount,
    },
    directResultSummary: {
      success: directResult?.success || false,
      error: directResult?.error || null,
      details: directResult?.details || null,
      textLength: normalizeText(directResult?.text || "").length,
      pageCount: directResult?.pageCount || null,
      fileName: directResult?.fileName || null,
      mimeType: directResult?.mimeType || null,
    },
    ocrResultSummary: {
      success: ocrResult?.success || false,
      error: ocrResult?.error || null,
      details: ocrResult?.details || null,
      textLength: normalizeText(ocrResult?.text || "").length,
      fileName: ocrResult?.fileName || null,
      reason: ocrResult?.reason || null,
    },
    textMarkers: {
      textLength: flattened.length,
      statementOfDeficienciesIndex:
        flattened.search(/statement of deficiencies/i) >= 0
          ? flattened.search(/statement of deficiencies/i)
          : null,
      cms2567Index:
        flattened.search(/cms\s*[-–—]?\s*2567|2567/i) >= 0
          ? flattened.search(/cms\s*[-–—]?\s*2567|2567/i)
          : null,
      firstFtagLikeMatch: firstFtagMatch ? firstFtagMatch[0] : null,
      firstCfrLikeMatch: firstCfrMatch ? firstCfrMatch[0] : null,
      firstDeficientPracticeIndex:
        flattened.search(/deficient practice/i) >= 0
          ? flattened.search(/deficient practice/i)
          : null,
    },
    debugTextStart: flattened.slice(0, 2500),
    debugTextEnd: flattened.slice(Math.max(flattened.length - 2500, 0)),
    debugFtagSnippets: tagSnippets,
  };
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

async function getPdfTextDirectlyFromDrive(driveConnectorUrl, fileId) {
  const fileData = await fetchJson(
    `${driveConnectorUrl}?action=file&fileId=${encodeURIComponent(fileId)}`
  );

  if (!fileData.success) {
    return {
      success: false,
      error: "Could not retrieve PDF file as base64",
      details: fileData,
    };
  }

  if (!fileData.base64) {
    return {
      success: false,
      error: "Apps Script did not return base64 content",
      details: fileData,
    };
  }

  try {
    const pdfParse = await loadPdfParse();
    const buffer = Buffer.from(fileData.base64, "base64");
    const parsed = await pdfParse(buffer);

    return {
      success: true,
      source: "Direct PDF text extraction",
      fileName: fileData.fileName,
      mimeType: fileData.mimeType,
      text: parsed.text || "",
      pageCount: parsed.numpages || null,
      info: parsed.info || null,
    };
  } catch (error) {
    return {
      success: false,
      error: "Direct PDF text extraction failed",
      details: error.message,
      fileName: fileData.fileName,
      mimeType: fileData.mimeType,
    };
  }
}

async function getGoogleOcrText(driveConnectorUrl, fileId) {
  const ocrData = await fetchJson(
    `${driveConnectorUrl}?action=ocrText&fileId=${encodeURIComponent(fileId)}`
  );

  if (!ocrData.success) {
    return {
      success: false,
      error: "Google Drive OCR failed",
      details: ocrData,
    };
  }

  return {
    success: true,
    source: "Google Drive OCR",
    fileName: ocrData.fileName,
    fileId,
    text: ocrData.text || "",
    textLength: ocrData.textLength || 0,
  };
}

function chooseBestTextSource(directResult, ocrResult) {
  const directText = normalizeText(directResult?.text || "");
  const ocrText = normalizeText(ocrResult?.text || "");

  const directHasFtags = /\bF\s*0?\d{3}\b/i.test(directText);
  const ocrHasFtags = /\bF\s*0?\d{3}\b/i.test(ocrText);

  const directHasCfr = /\b483\.\d+/i.test(directText);
  const ocrHasCfr = /\b483\.\d+/i.test(ocrText);

  const directScore =
    directText.length +
    (directHasFtags ? 100000 : 0) +
    (directHasCfr ? 20000 : 0);

  const ocrScore =
    ocrText.length +
    (ocrHasFtags ? 100000 : 0) +
    (ocrHasCfr ? 20000 : 0);

  if (directResult?.success && directText.length > 200 && directScore >= ocrScore) {
    return {
      source: directResult.source,
      fileName: directResult.fileName,
      text: directText,
      directTextLength: directText.length,
      ocrTextLength: ocrText.length,
      directHasFtags,
      ocrHasFtags,
      directHasCfr,
      ocrHasCfr,
      directPageCount: directResult.pageCount || null,
      selectionReason: "Direct PDF text scored higher or equal",
    };
  }

  if (ocrResult?.success && ocrText.length > 0) {
    return {
      source: ocrResult.source,
      fileName: ocrResult.fileName,
      text: ocrText,
      directTextLength: directText.length,
      ocrTextLength: ocrText.length,
      directHasFtags,
      ocrHasFtags,
      directHasCfr,
      ocrHasCfr,
      directPageCount: directResult?.pageCount || null,
      selectionReason: "Google OCR scored higher or direct text unavailable",
    };
  }

  if (directResult?.success) {
    return {
      source: directResult.source,
      fileName: directResult.fileName,
      text: directText,
      directTextLength: directText.length,
      ocrTextLength: ocrText.length,
      directHasFtags,
      ocrHasFtags,
      directHasCfr,
      ocrHasCfr,
      directPageCount: directResult.pageCount || null,
      selectionReason: "Fallback to direct text despite low confidence",
    };
  }

  return {
    source: "No text source",
    fileName: "",
    text: "",
    directTextLength: directText.length,
    ocrTextLength: ocrText.length,
    directHasFtags,
    ocrHasFtags,
    directHasCfr,
    ocrHasCfr,
    directPageCount: directResult?.pageCount || null,
    selectionReason: "No usable text source found",
  };
}

function buildParsedResult({
  fileId,
  submissionId,
  facility,
  surveyType,
  selectedTextSource,
  directResult,
  ocrResult,
}) {
  const text = normalizeText(selectedTextSource.text || "");

  const deficiencies = extractDeficiencies(text);
  const intakeNumberFromPdf = extractIntakeNumber(
    selectedTextSource.fileName,
    text
  );
  const dates = extractSurveyDates(text);
  const severitySummary = buildSeveritySummary(deficiencies);
  const coverLetterSignal = detectCoverLetterDeficiencyIndication(text);
  const compactDebug = buildCompactDebug(
    text,
    directResult,
    ocrResult,
    selectedTextSource
  );

  return {
    success: true,
    parserVersion: PARSER_VERSION,
    fileName: selectedTextSource.fileName || directResult?.fileName || "",
    fileId,
    submissionId: submissionId || "",
    facility: facility || "",
    surveyType: surveyType || "",
    intakeNumberFromPdf,
    deficienciesFound:
      deficiencies.length > 0 ||
      coverLetterSignal.coverLetterIndicatesDeficiencies,
    deficiencies,
    ftags: deficiencies.map((d) => `${d.ftag} - ${d.scopeSeverity}`),
    scopeSeverity: deficiencies.map((d) => d.scopeSeverity),
    severitySummary,
    coverLetterIndicatesDeficiencies:
      coverLetterSignal.coverLetterIndicatesDeficiencies,
    coverLetterHighestSeverity: coverLetterSignal.coverLetterHighestSeverity,
    surveyCompletedDate: dates.surveyCompletedDate,
    surveyStartDate: dates.surveyStartDate,
    surveyEndDate: dates.surveyEndDate,
    textLength: text.length,
    textSource: selectedTextSource.source,
    ocrSource: selectedTextSource.source,
    savedAt: new Date().toISOString(),
    extractionDebug: compactDebug,
  };
}

function buildResultForSaving(parsedResult) {
  return {
    success: parsedResult.success,
    parserVersion: parsedResult.parserVersion,
    fileName: parsedResult.fileName,
    fileId: parsedResult.fileId,
    submissionId: parsedResult.submissionId,
    facility: parsedResult.facility,
    surveyType: parsedResult.surveyType,
    intakeNumberFromPdf: parsedResult.intakeNumberFromPdf,
    deficienciesFound: parsedResult.deficienciesFound,
    deficiencies: parsedResult.deficiencies,
    ftags: parsedResult.ftags,
    scopeSeverity: parsedResult.scopeSeverity,
    severitySummary: parsedResult.severitySummary,
    coverLetterIndicatesDeficiencies:
      parsedResult.coverLetterIndicatesDeficiencies,
    coverLetterHighestSeverity: parsedResult.coverLetterHighestSeverity,
    surveyCompletedDate: parsedResult.surveyCompletedDate,
    surveyStartDate: parsedResult.surveyStartDate,
    surveyEndDate: parsedResult.surveyEndDate,
    textLength: parsedResult.textLength,
    textSource: parsedResult.textSource,
    ocrSource: parsedResult.ocrSource,
    savedAt: parsedResult.savedAt,
    extractionDebug: parsedResult.extractionDebug,
  };
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
  const compactRawJson = buildResultForSaving(parsedResult);

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
      rawJson: compactRawJson,
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
        parserVersion: PARSER_VERSION,
        error: "Missing fileId",
      });
    }

    if (!driveConnectorUrl) {
      return Response.json({
        success: false,
        parserVersion: PARSER_VERSION,
        error: "Missing DRIVE_CONNECTOR_URL",
      });
    }

    const directResult = await getPdfTextDirectlyFromDrive(
      driveConnectorUrl,
      fileId
    );

    let ocrResult = null;

    const directText = normalizeText(directResult?.text || "");
    const directLooksUseful =
      directResult?.success &&
      directText.length > 200 &&
      (/\bF\s*0?\d{3}\b/i.test(directText) || /\b483\.\d+/i.test(directText));

    if (!directLooksUseful) {
      ocrResult = await getGoogleOcrText(driveConnectorUrl, fileId);
    } else {
      ocrResult = {
        success: false,
        source: "Google OCR skipped",
        text: "",
        textLength: 0,
        reason: "Direct PDF text looked useful",
      };
    }

    const selectedTextSource = chooseBestTextSource(directResult, ocrResult);
    const text = normalizeText(selectedTextSource.text || "");

    if (!text) {
      return Response.json({
        success: false,
        parserVersion: PARSER_VERSION,
        error: "No usable text extracted from PDF",
        directResultSummary: {
          success: directResult?.success || false,
          error: directResult?.error || null,
          details: directResult?.details || null,
          textLength: normalizeText(directResult?.text || "").length,
          fileName: directResult?.fileName || null,
        },
        ocrResultSummary: {
          success: ocrResult?.success || false,
          error: ocrResult?.error || null,
          details: ocrResult?.details || null,
          textLength: normalizeText(ocrResult?.text || "").length,
          fileName: ocrResult?.fileName || null,
        },
      });
    }

    const parsedResult = buildParsedResult({
      fileId,
      submissionId,
      facility,
      surveyType,
      selectedTextSource,
      directResult,
      ocrResult,
    });

    const saveResult = await saveAnalysisToSheet({
      driveConnectorUrl,
      submissionId: submissionId || "",
      fileId,
      fileName: parsedResult.fileName || "",
      facility: facility || "",
      surveyType: surveyType || "",
      intakeNumberFromPdf: parsedResult.intakeNumberFromPdf,
      deficiencies: parsedResult.deficiencies,
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
      parserVersion: PARSER_VERSION,
      error: error.message,
    });
  }
}
