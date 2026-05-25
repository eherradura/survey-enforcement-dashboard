export const runtime = "nodejs";
export const maxDuration = 300;

import { Storage } from "@google-cloud/storage";
import vision from "@google-cloud/vision";

const PARSER_VERSION = "direct-pdf-v6-no-deficiency-detection";

async function loadPdfParse() {
  const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
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

  const facilityReportedIncidentMatch = cleanText.match(
    /facility[-\s]*reported incident number\s+(\d{4,})/i
  );

  if (facilityReportedIncidentMatch) {
    return facilityReportedIncidentMatch[1];
  }

  const complaintFriMatch =
    cleanText.match(/complaint\/FRI.*?(?:number|intake)?\s*(\d{4,})/i) ||
    cleanText.match(/complaint\s*\/?\s*FRI\s+survey.*?(\d{4,})/i);

  if (complaintFriMatch) {
    return complaintFriMatch[1];
  }

  if (isAnnualOrRecertification(fileName, cleanText)) {
    return "Recertification";
  }

  const intakeMatch =
    cleanText.match(/intake\s*(number|#)?\s*[:#]?\s*([A-Z]{1,5}\d{4,})/i) ||
    cleanText.match(/intake\s*(number|#)?\s*[:#]?\s*(\d{4,})/i) ||
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

      const nearbyText = lines.slice(Math.max(i - 8, 0), i + 36).join(" ");

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
    /\bF\s*0?(\d{3})\b.{0,900}?\b(?:SS|S\/S)\s*[:=]?\s*([A-L])\b/gi,
    /\b(?:SS|S\/S)\s*[:=]?\s*([A-L])\b.{0,900}?\bF\s*0?(\d{3})\b/gi,
    /\bF\s*0?(\d{3})\b.{0,900}?\bScope\s*\/?\s*Severity\s*[:=]?\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\b.{0,900}?\bSeverity\s*[:=]?\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\b.{0,900}?\bLevel\s*[:=]?\s*([A-L])\b/gi,
    /\bTag\s*[:#]?\s*F?\s*0?(\d{3})\b.{0,1200}?\b(?:Scope\s*\/?\s*Severity|Severity|SS|S\/S|Level)\s*[:=]?\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\s+([A-L])\b/gi,
    /\bF\s*0?(\d{3})\s*[-–—]\s*([A-L])\b/gi,
    /\bF\s*0?(\d{3})\b(?:(?!\bF\s*0?\d{3}\b).){0,2600}?\b(?:SS|S\/S|Scope\s*\/?\s*Severity|Scope\s+and\s+Severity|Severity|Level)\s*[:=]?\s*([A-L])\b/gi,
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

function convertLongDateToDisplay(value) {
  if (!value) return null;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const year = parsed.getFullYear();

  return `${month}-${day}-${year}`;
}

function extractRemedyDates(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  const dpnaMatch =
    cleanText.match(/DPNA\s+effective\s+([A-Z][a-z]+ \d{1,2}, \d{4})/i) ||
    cleanText.match(
      /denial\s+of\s+payment\s+for\s+new\s+admissions.*?effective\s+([A-Z][a-z]+ \d{1,2}, \d{4})/i
    ) ||
    cleanText.match(
      /statutory\s+DPNA\s+effective\s+([A-Z][a-z]+ \d{1,2}, \d{4})/i
    );

  const terminationMatch =
    cleanText.match(
      /provider\s+agreement\s+be\s+terminated\s+on\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})/i
    ) ||
    cleanText.match(/terminated\s+on\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})/i) ||
    cleanText.match(
      /termination\s+date\s*[:\-]?\s*([A-Z][a-z]+ \d{1,2},\s*\d{4})/i
    );

  const cmpMatch =
    cleanText.match(
      /civil\s+money\s+penalty.*?\(\$?([\d,]+(?:\.\d{2})?)\)/i
    ) ||
    cleanText.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*(?:civil money penalty|CMP)/i);

  const substantialComplianceDeadlineMatch =
    cleanText.match(
      /failed\s+to\s+achieve\s+substantial\s+compliance\s+by\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})/i
    ) ||
    cleanText.match(
      /substantial\s+compliance\s+has\s+not\s+been\s+achieved\s+by\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})/i
    );

  return {
    dpnaDateFromPdf: dpnaMatch ? convertLongDateToDisplay(dpnaMatch[1]) : null,
    terminationDateFromPdf: terminationMatch
      ? convertLongDateToDisplay(terminationMatch[1])
      : null,
    cmpAmountFromPdf: cmpMatch ? `$${cmpMatch[1]}` : null,
    substantialComplianceDeadlineFromPdf: substantialComplianceDeadlineMatch
      ? convertLongDateToDisplay(substantialComplianceDeadlineMatch[1])
      : null,
  };
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
      /survey conducted on\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–—to]+\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    ) ||
    cleanText.match(
      /conducted from\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–—to]+\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
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

function detectNoDeficiencyLetter(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  return (
    /no deficiencies of participation requirements were identified/i.test(
      cleanText
    ) ||
    /no deficiencies were identified/i.test(cleanText) ||
    /no deficiency was identified/i.test(cleanText) ||
    /documents that no deficiencies/i.test(cleanText) ||
    /documents? that no deficiencies of participation requirements were identified/i.test(
      cleanText
    )
  );
}

function detectCoverLetterDeficiencyIndication(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  const noDeficiencyLetter = detectNoDeficiencyLetter(cleanText);

  if (noDeficiencyLetter) {
    return {
      coverLetterIndicatesDeficiencies: false,
      coverLetterHighestSeverity: null,
    };
  }

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

function buildCompactDebug(
  text,
  directResult,
  ocrResult,
  visionResult,
  selectedTextSource
) {
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
    /\bDPNA\b/gi,
    /\bterminated\s+on\b/gi,
    /\bno deficiencies\b/gi,
    /\bfacility[-\s]*reported incident number\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of flattened.matchAll(pattern)) {
      const start = Math.max(match.index - 300, 0);
      const end = Math.min(match.index + 550, flattened.length);

      tagSnippets.push({
        match: match[0],
        snippet: flattened.slice(start, end),
      });

      if (tagSnippets.length >= 35) break;
    }

    if (tagSnippets.length >= 35) break;
  }

  return {
    parserVersion: PARSER_VERSION,
    selectedTextSource: {
      source: selectedTextSource.source,
      selectionReason: selectedTextSource.selectionReason,
      directTextLength: selectedTextSource.directTextLength,
      ocrTextLength: selectedTextSource.ocrTextLength,
      visionTextLength: selectedTextSource.visionTextLength,
      directHasFtags: selectedTextSource.directHasFtags,
      ocrHasFtags: selectedTextSource.ocrHasFtags,
      visionHasFtags: selectedTextSource.visionHasFtags,
      directHasCfr: selectedTextSource.directHasCfr,
      ocrHasCfr: selectedTextSource.ocrHasCfr,
      visionHasCfr: selectedTextSource.visionHasCfr,
      directPageCount: selectedTextSource.directPageCount,
      visionPageCount: selectedTextSource.visionPageCount,
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
    visionResultSummary: {
      success: visionResult?.success || false,
      error: visionResult?.error || null,
      details: visionResult?.details || null,
      textLength: normalizeText(visionResult?.text || "").length,
      pageCount: visionResult?.pageCount || null,
      inputGcsUri: visionResult?.inputGcsUri || null,
      outputGcsPrefix: visionResult?.outputGcsPrefix || null,
      skipped: visionResult?.skipped || false,
      reason: visionResult?.reason || null,
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
      noDeficiencyIndex:
        flattened.search(/no deficiencies/i) >= 0
          ? flattened.search(/no deficiencies/i)
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

function getGoogleCloudCredentials() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!rawJson) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const credentials = JSON.parse(rawJson);

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  return credentials;
}

function getGoogleCloudClients() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;

  if (!projectId) {
    throw new Error("Missing GOOGLE_CLOUD_PROJECT_ID");
  }

  if (!bucketName) {
    throw new Error("Missing GOOGLE_CLOUD_BUCKET_NAME");
  }

  const credentials = getGoogleCloudCredentials();

  const storage = new Storage({
    projectId,
    credentials,
  });

  const visionClient = new vision.ImageAnnotatorClient({
    projectId,
    credentials,
  });

  return {
    projectId,
    bucketName,
    storage,
    visionClient,
  };
}

async function getPdfFileFromDrive(driveConnectorUrl, fileId) {
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

  return {
    success: true,
    fileName: fileData.fileName || `${fileId}.pdf`,
    mimeType: fileData.mimeType || "application/pdf",
    buffer: Buffer.from(fileData.base64, "base64"),
  };
}

async function getPdfTextDirectlyFromBuffer(pdfFile) {
  if (!pdfFile?.success || !pdfFile.buffer) {
    return {
      success: false,
      error: "No PDF buffer available for direct extraction",
    };
  }

  try {
    const pdfParse = await loadPdfParse();
    const parsed = await pdfParse(pdfFile.buffer);

    return {
      success: true,
      source: "Direct PDF text extraction",
      fileName: pdfFile.fileName,
      mimeType: pdfFile.mimeType,
      text: parsed.text || "",
      pageCount: parsed.numpages || null,
      info: parsed.info || null,
    };
  } catch (error) {
    return {
      success: false,
      error: "Direct PDF text extraction failed",
      details: error.message,
      fileName: pdfFile.fileName,
      mimeType: pdfFile.mimeType,
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

function shouldRunVisionOcr(initialParsedResult, selectedTextSource) {
  const allowVision = String(process.env.ENABLE_GOOGLE_CLOUD_VISION_OCR || "true")
    .toLowerCase()
    .trim();

  if (allowVision === "false" || allowVision === "0" || allowVision === "no") {
    return false;
  }

  if (initialParsedResult.noDeficiencyLetter) {
    return false;
  }

  if (initialParsedResult.deficiencies.length > 0) {
    return false;
  }

  if (initialParsedResult.coverLetterIndicatesDeficiencies) {
    return true;
  }

  if (!selectedTextSource.directHasFtags && !selectedTextSource.ocrHasFtags) {
    return true;
  }

  return false;
}

async function runGoogleCloudVisionPdfOcr({ pdfFile, fileId, pageCount }) {
  if (!pdfFile?.success || !pdfFile.buffer) {
    return {
      success: false,
      error: "No PDF buffer available for Google Cloud Vision OCR",
    };
  }

  const maxPages = Number(process.env.GOOGLE_VISION_MAX_PAGES || "45");

  if (pageCount && pageCount > maxPages) {
    return {
      success: false,
      skipped: true,
      reason: `Skipped Google Cloud Vision OCR because page count ${pageCount} exceeds max ${maxPages}`,
      pageCount,
    };
  }

  try {
    const { bucketName, storage, visionClient } = getGoogleCloudClients();

    const safeFileName = String(pdfFile.fileName || `${fileId}.pdf`)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);

    const jobId = `${fileId}-${Date.now()}`;
    const inputObjectName = `ocr-input/${jobId}/${safeFileName}`;
    const outputPrefix = `ocr-output/${jobId}/`;

    const bucket = storage.bucket(bucketName);

    await bucket.file(inputObjectName).save(pdfFile.buffer, {
      resumable: false,
      contentType: "application/pdf",
      metadata: {
        cacheControl: "no-store",
      },
    });

    const inputGcsUri = `gs://${bucketName}/${inputObjectName}`;
    const outputGcsPrefix = `gs://${bucketName}/${outputPrefix}`;

    const request = {
      requests: [
        {
          inputConfig: {
            gcsSource: {
              uri: inputGcsUri,
            },
            mimeType: "application/pdf",
          },
          features: [
            {
              type: "DOCUMENT_TEXT_DETECTION",
            },
          ],
          outputConfig: {
            gcsDestination: {
              uri: outputGcsPrefix,
            },
            batchSize: 10,
          },
        },
      ],
    };

    const [operation] = await visionClient.asyncBatchAnnotateFiles(request);
    await operation.promise();

    const [files] = await bucket.getFiles({
      prefix: outputPrefix,
    });

    const jsonFiles = files.filter((file) => file.name.endsWith(".json"));

    if (jsonFiles.length === 0) {
      return {
        success: false,
        error: "Google Cloud Vision completed but no OCR JSON output was found",
        inputGcsUri,
        outputGcsPrefix,
      };
    }

    let combinedText = "";
    let pageTotal = 0;

    for (const file of jsonFiles) {
      const [contents] = await file.download();
      const json = JSON.parse(contents.toString("utf8"));

      const responses = Array.isArray(json.responses) ? json.responses : [];

      pageTotal += responses.length;

      for (const response of responses) {
        const pageText =
          response?.fullTextAnnotation?.text ||
          response?.textAnnotations?.[0]?.description ||
          "";

        if (pageText) {
          combinedText += `\n\n${pageText}`;
        }
      }
    }

    if (
      String(process.env.GOOGLE_VISION_CLEANUP || "true").toLowerCase() !==
      "false"
    ) {
      await Promise.allSettled([
        bucket.file(inputObjectName).delete(),
        ...files.map((file) => file.delete()),
      ]);
    }

    return {
      success: true,
      source: "Google Cloud Vision OCR",
      fileName: pdfFile.fileName,
      text: normalizeText(combinedText),
      textLength: normalizeText(combinedText).length,
      pageCount: pageTotal || pageCount || null,
      inputGcsUri,
      outputGcsPrefix,
    };
  } catch (error) {
    return {
      success: false,
      error: "Google Cloud Vision OCR failed",
      details: error.message,
      pageCount: pageCount || null,
    };
  }
}

function chooseBestTextSource(directResult, ocrResult, visionResult = null) {
  const directText = normalizeText(directResult?.text || "");
  const ocrText = normalizeText(ocrResult?.text || "");
  const visionText = normalizeText(visionResult?.text || "");

  const directHasFtags = /\bF\s*0?\d{3}\b/i.test(directText);
  const ocrHasFtags = /\bF\s*0?\d{3}\b/i.test(ocrText);
  const visionHasFtags = /\bF\s*0?\d{3}\b/i.test(visionText);

  const directHasCfr = /\b483\.\d+/i.test(directText);
  const ocrHasCfr = /\b483\.\d+/i.test(ocrText);
  const visionHasCfr = /\b483\.\d+/i.test(visionText);

  const directScore =
    directText.length +
    (directHasFtags ? 100000 : 0) +
    (directHasCfr ? 20000 : 0);

  const ocrScore =
    ocrText.length +
    (ocrHasFtags ? 100000 : 0) +
    (ocrHasCfr ? 20000 : 0);

  const visionScore =
    visionText.length +
    (visionHasFtags ? 200000 : 0) +
    (visionHasCfr ? 50000 : 0);

  if (
    visionResult?.success &&
    visionText.length > 200 &&
    visionScore >= directScore &&
    visionScore >= ocrScore
  ) {
    return {
      source: visionResult.source,
      fileName: visionResult.fileName,
      text: visionText,
      directTextLength: directText.length,
      ocrTextLength: ocrText.length,
      visionTextLength: visionText.length,
      directHasFtags,
      ocrHasFtags,
      visionHasFtags,
      directHasCfr,
      ocrHasCfr,
      visionHasCfr,
      directPageCount: directResult?.pageCount || null,
      visionPageCount: visionResult?.pageCount || null,
      selectionReason: "Google Cloud Vision OCR scored highest",
    };
  }

  if (
    directResult?.success &&
    directText.length > 200 &&
    directScore >= ocrScore
  ) {
    return {
      source: directResult.source,
      fileName: directResult.fileName,
      text: directText,
      directTextLength: directText.length,
      ocrTextLength: ocrText.length,
      visionTextLength: visionText.length,
      directHasFtags,
      ocrHasFtags,
      visionHasFtags,
      directHasCfr,
      ocrHasCfr,
      visionHasCfr,
      directPageCount: directResult.pageCount || null,
      visionPageCount: visionResult?.pageCount || null,
      selectionReason: "Direct PDF text scored higher or equal than Google Drive OCR",
    };
  }

  if (ocrResult?.success && ocrText.length > 0) {
    return {
      source: ocrResult.source,
      fileName: ocrResult.fileName,
      text: ocrText,
      directTextLength: directText.length,
      ocrTextLength: ocrText.length,
      visionTextLength: visionText.length,
      directHasFtags,
      ocrHasFtags,
      visionHasFtags,
      directHasCfr,
      ocrHasCfr,
      visionHasCfr,
      directPageCount: directResult?.pageCount || null,
      visionPageCount: visionResult?.pageCount || null,
      selectionReason: "Google Drive OCR scored higher or direct text unavailable",
    };
  }

  if (directResult?.success) {
    return {
      source: directResult.source,
      fileName: directResult.fileName,
      text: directText,
      directTextLength: directText.length,
      ocrTextLength: ocrText.length,
      visionTextLength: visionText.length,
      directHasFtags,
      ocrHasFtags,
      visionHasFtags,
      directHasCfr,
      ocrHasCfr,
      visionHasCfr,
      directPageCount: directResult.pageCount || null,
      visionPageCount: visionResult?.pageCount || null,
      selectionReason: "Fallback to direct text despite low confidence",
    };
  }

  return {
    source: "No text source",
    fileName: "",
    text: "",
    directTextLength: directText.length,
    ocrTextLength: ocrText.length,
    visionTextLength: visionText.length,
    directHasFtags,
    ocrHasFtags,
    visionHasFtags,
    directHasCfr,
    ocrHasCfr,
    visionHasCfr,
    directPageCount: directResult?.pageCount || null,
    visionPageCount: visionResult?.pageCount || null,
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
  visionResult,
}) {
  const text = normalizeText(selectedTextSource.text || "");

  const noDeficiencyLetter = detectNoDeficiencyLetter(text);
  const extractedDeficiencies = extractDeficiencies(text);
  const deficiencies = noDeficiencyLetter ? [] : extractedDeficiencies;

  const intakeNumberFromPdf = extractIntakeNumber(
    selectedTextSource.fileName,
    text
  );

  const dates = extractSurveyDates(text);
  const remedyDates = noDeficiencyLetter
    ? {
        dpnaDateFromPdf: null,
        terminationDateFromPdf: null,
        cmpAmountFromPdf: null,
        substantialComplianceDeadlineFromPdf: null,
      }
    : extractRemedyDates(text);

  const severitySummary = buildSeveritySummary(deficiencies);
  const coverLetterSignal = detectCoverLetterDeficiencyIndication(text);
  const compactDebug = buildCompactDebug(
    text,
    directResult,
    ocrResult,
    visionResult,
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
    noDeficiencyLetter,
    deficienciesFound: noDeficiencyLetter
      ? false
      : deficiencies.length > 0 ||
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
    dpnaDateFromPdf: remedyDates.dpnaDateFromPdf,
    terminationDateFromPdf: remedyDates.terminationDateFromPdf,
    cmpAmountFromPdf: remedyDates.cmpAmountFromPdf,
    substantialComplianceDeadlineFromPdf:
      remedyDates.substantialComplianceDeadlineFromPdf,
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
    noDeficiencyLetter: parsedResult.noDeficiencyLetter,
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
    dpnaDateFromPdf: parsedResult.dpnaDateFromPdf,
    terminationDateFromPdf: parsedResult.terminationDateFromPdf,
    cmpAmountFromPdf: parsedResult.cmpAmountFromPdf,
    substantialComplianceDeadlineFromPdf:
      parsedResult.substantialComplianceDeadlineFromPdf,
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

    const pdfFile = await getPdfFileFromDrive(driveConnectorUrl, fileId);

    if (!pdfFile.success) {
      return Response.json({
        success: false,
        parserVersion: PARSER_VERSION,
        error: pdfFile.error,
        details: pdfFile.details || null,
      });
    }

    const directResult = await getPdfTextDirectlyFromBuffer(pdfFile);

    let ocrResult = null;

    const directText = normalizeText(directResult?.text || "");
    const directLooksUseful =
      directResult?.success &&
      directText.length > 200 &&
      (/\bF\s*0?\d{3}\b/i.test(directText) ||
        /\b483\.\d+/i.test(directText) ||
        /no deficiencies/i.test(directText));

    if (!directLooksUseful) {
      ocrResult = await getGoogleOcrText(driveConnectorUrl, fileId);
    } else {
      ocrResult = {
        success: false,
        source: "Google Drive OCR skipped",
        text: "",
        textLength: 0,
        reason: "Direct PDF text looked useful",
      };
    }

    let selectedTextSource = chooseBestTextSource(directResult, ocrResult);
    let visionResult = {
      success: false,
      skipped: true,
      reason: "Google Cloud Vision OCR not evaluated yet",
      text: "",
    };

    const initialParsedResult = buildParsedResult({
      fileId,
      submissionId,
      facility,
      surveyType,
      selectedTextSource,
      directResult,
      ocrResult,
      visionResult,
    });

    if (shouldRunVisionOcr(initialParsedResult, selectedTextSource)) {
      visionResult = await runGoogleCloudVisionPdfOcr({
        pdfFile,
        fileId,
        pageCount: directResult?.pageCount || null,
      });

      selectedTextSource = chooseBestTextSource(
        directResult,
        ocrResult,
        visionResult
      );
    }

    const finalParsedResult = buildParsedResult({
      fileId,
      submissionId,
      facility,
      surveyType,
      selectedTextSource,
      directResult,
      ocrResult,
      visionResult,
    });

    const saveResult = await saveAnalysisToSheet({
      driveConnectorUrl,
      submissionId: submissionId || "",
      fileId,
      fileName: finalParsedResult.fileName || "",
      facility: facility || "",
      surveyType: surveyType || "",
      intakeNumberFromPdf: finalParsedResult.intakeNumberFromPdf,
      deficiencies: finalParsedResult.deficiencies,
      parsedResult: finalParsedResult,
    });

    return Response.json({
      ...finalParsedResult,
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
