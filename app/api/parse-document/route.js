export const runtime = "nodejs";
export const maxDuration = 60;

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

  // Pattern 1: line-based F-tag with nearby SS/scope severity
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ftagMatches = [...line.matchAll(/\bF\s*0?(\d{3})\b/gi)];

    for (const ftagMatch of ftagMatches) {
      const ftag = normalizeFtag(ftagMatch[1]);

      if (ftag === "F000") continue;

      const nearbyText = lines.slice(i, i + 28).join(" ");

      const ssMatch =
        nearbyText.match(/\bSS\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bS\/S\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bScope\s*\/?\s*Severity\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bScope\s+and\s+Severity\s*[:=]?\s*([A-L])\b/i) ||
        nearbyText.match(/\bSeverity\s*[:=]?\s*([A-L])\b/i);

      if (ssMatch) {
        addDeficiency(deficienciesByFtag, ftag, ssMatch[1]);
      }
    }
  }

  // Pattern 2: compact same-block patterns
  const compactPatterns = [
    /\bF\s*0?(\d{3})\b.{0,500}?\b(?:SS|S\/S)\s*[:=]?\s*([A-L])\b/gi,
    /\b(?:SS|S\/S)\s*[:=]?\s*([A-L])\b.{0,500}?\bF\s*0?(\d{3})\b/gi,
    /\bF\s*0?(\d{3})\b.{0,500}?\bScope\s*\/?\s*Severity\s*[:=]?\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\b.{0,500}?\bSeverity\s*[:=]?\s*([A-L])\b/gi,
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

  // Pattern 3: F 0689 D or F689 E
  const directFtagSeverityPattern = /\bF\s*0?(\d{3})\s+([A-L])\b/gi;

  for (const match of flattened.matchAll(directFtagSeverityPattern)) {
    const ftag = normalizeFtag(match[1]);
    const severity = match[2];

    addDeficiency(deficienciesByFtag, ftag, severity);
  }

  // Pattern 4: F689 - E
  const dashPattern = /\bF\s*0?(\d{3})\s*[-–—]\s*([A-L])\b/gi;

  for (const match of flattened.matchAll(dashPattern)) {
    const ftag = normalizeFtag(match[1]);
    const severity = match[2];

    addDeficiency(deficienciesByFtag, ftag, severity);
  }

  // Pattern 5: Tag F689 ... Severity E
  const tagScopePattern =
    /\bTag\s*[:#]?\s*F?\s*0?(\d{3})\b.{0,900}?\b(?:Scope\s*\/?\s*Severity|Severity|SS|S\/S)\s*[:=]?\s*([A-L])\b/gi;

  for (const match of flattened.matchAll(tagScopePattern)) {
    const ftag = normalizeFtag(match[1]);
    const severity = match[2];

    addDeficiency(deficienciesByFtag, ftag, severity);
  }

  // Pattern 6: broad F-tag block with severity later
  const broadBlockPattern =
    /\bF\s*0?(\d{3})\b(?:(?!\bF\s*0?\d{3}\b).){0,1800}?\b(?:SS|S\/S|Scope\s*\/?\s*Severity|Scope\s+and\s+Severity|Severity)\s*[:=]?\s*([A-L])\b/gi;

  for (const match of flattened.matchAll(broadBlockPattern)) {
    const ftag = normalizeFtag(match[1]);
    const severity = match[2];

    addDeficiency(deficienciesByFtag, ftag, severity);
  }

  // Pattern 7: F689 ... Level E
  const levelPattern =
    /\bF\s*0?(\d{3})\b.{0,900}?\b(?:level|severity level)\s*[:=]?\s*([A-L])\b/gi;

  for (const match of flattened.matchAll(levelPattern)) {
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

function detectCoverLetterDeficiencyIndication(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  const mentionsDeficiencies =
    /this survey found the most serious deficiency|deficiencies cited during this survey|poc for the deficiencies|statement of deficiencies/i.test(
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

function buildDebugFtagSnippets(text) {
  const normalized = normalizeText(text);
  const flattened = normalized.replace(/\n/g, " ");
  const snippets = [];

  const patterns = [
    /\bF\s*0?\d{3}\b/gi,
    /\bF[-\s]?\d{3}\b/gi,
    /\bF\d{3}\b/gi,
    /\bSS\s*[:=]?\s*[A-L]\b/gi,
    /\bS\/S\s*[:=]?\s*[A-L]\b/gi,
    /\bScope\s*\/?\s*Severity\b/gi,
    /\bTag\s*[:#]?\s*F?\s*0?\d{3}\b/gi,
    /\bCFR\s*483\b/gi,
    /\b483\.\d+/gi,
  ];

  for (const pattern of patterns) {
    for (const match of flattened.matchAll(pattern)) {
      const start = Math.max(match.index - 450, 0);
      const end = Math.min(match.index + 900, flattened.length);

      snippets.push({
        match: match[0],
        snippet: flattened.slice(start, end),
      });

      if (snippets.length >= 80) {
        return snippets;
      }
    }
  }

  return snippets;
}

function extractPotentialTagLines(text) {
  const normalized = normalizeText(text);

  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      return (
        /\bF\s*0?\d{3}\b/i.test(line) ||
        /\bF\d{3}\b/i.test(line) ||
        /\bSS\s*[:=]?\s*[A-L]\b/i.test(line) ||
        /\bS\/S\s*[:=]?\s*[A-L]\b/i.test(line) ||
        /\bScope\s*\/?\s*Severity\b/i.test(line) ||
        /\bTag\b/i.test(line) ||
        /\bCFR\s*483\b/i.test(line) ||
        /\b483\.\d+/i.test(line) ||
        /\bdeficient practice\b/i.test(line)
      );
    })
    .slice(0, 200);
}

function buildFullTextDebug(text) {
  const normalized = normalizeText(text);
  const flattened = normalized.replace(/\n/g, " ");

  const totalLength = flattened.length;
  const middleStart = Math.max(Math.floor(totalLength / 2) - 4000, 0);
  const middleEnd = Math.min(Math.floor(totalLength / 2) + 4000, totalLength);

  const statementIndex = flattened.search(/statement of deficiencies/i);
  const cms2567Index = flattened.search(/cms\s*[-–—]?\s*2567|2567/i);
  const providerIndex = flattened.search(/provider\/supplier|provider supplier/i);
  const firstFtagMatch = flattened.match(/\bF\s*0?\d{3}\b/i);
  const firstCfrMatch = flattened.match(/\b483\.\d+/i);
  const firstDeficientPracticeIndex = flattened.search(/deficient practice/i);

  return {
    textLength: totalLength,
    debugTextStart: flattened.slice(0, 8000),
    debugTextMiddle: flattened.slice(middleStart, middleEnd),
    debugTextEnd: flattened.slice(Math.max(totalLength - 8000, 0), totalLength),
    statementOfDeficienciesIndex: statementIndex >= 0 ? statementIndex : null,
    cms2567Index: cms2567Index >= 0 ? cms2567Index : null,
    providerIndex: providerIndex >= 0 ? providerIndex : null,
    firstFtagLikeMatch: firstFtagMatch ? firstFtagMatch[0] : null,
    firstCfrLikeMatch: firstCfrMatch ? firstCfrMatch[0] : null,
    firstDeficientPracticeIndex:
      firstDeficientPracticeIndex >= 0 ? firstDeficientPracticeIndex : null,
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
      metadata: parsed.metadata || null,
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
    (directText.length || 0) +
    (directHasFtags ? 100000 : 0) +
    (directHasCfr ? 20000 : 0);

  const ocrScore =
    (ocrText.length || 0) +
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
        error: "No usable text extracted from PDF",
        directResult,
        ocrResult,
      });
    }

    const deficiencies = extractDeficiencies(text);
    const intakeNumberFromPdf = extractIntakeNumber(
      selectedTextSource.fileName,
      text
    );
    const dates = extractSurveyDates(text);
    const severitySummary = buildSeveritySummary(deficiencies);
    const coverLetterSignal = detectCoverLetterDeficiencyIndication(text);

    const fullTextDebug = buildFullTextDebug(text);
    const debugFtagSnippets = buildDebugFtagSnippets(text);
    const debugPotentialTagLines = extractPotentialTagLines(text);

    const parsedResult = {
      success: true,
      fileName: selectedTextSource.fileName || directResult.fileName || "",
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

      extractionDebug: {
        selectedTextSource,
        directResultSummary: {
          success: directResult?.success || false,
          error: directResult?.error || null,
          details: directResult?.details || null,
          source: directResult?.source || null,
          textLength: normalizeText(directResult?.text || "").length,
          pageCount: directResult?.pageCount || null,
          fileName: directResult?.fileName || null,
          mimeType: directResult?.mimeType || null,
        },
        ocrResultSummary: {
          success: ocrResult?.success || false,
          error: ocrResult?.error || null,
          details: ocrResult?.details || null,
          source: ocrResult?.source || null,
          textLength: normalizeText(ocrResult?.text || "").length,
          fileName: ocrResult?.fileName || null,
          reason: ocrResult?.reason || null,
        },
      },

      debug: {
        ...fullTextDebug,
        debugPotentialTagLines,
        debugFtagSnippets,
      },
    };

    const saveResult = await saveAnalysisToSheet({
      driveConnectorUrl,
      submissionId: submissionId || "",
      fileId,
      fileName: parsedResult.fileName || "",
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
