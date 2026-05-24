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

      const nearbyText = lines.slice(i, i + 12).join(" ");

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
    /\bF\s*0?(\d{3})\b.{0,160}?\b(?:SS|S\/S)\s*[:=]\s*([A-L])\b/gi;

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
    cleanText.match(/\(X3\)\s*DATE SURVEY COMPLETED\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);

  const surveyRange =
    cleanText.match(/survey conducted on\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*to\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    cleanText.match(/conducted on\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*to\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);

  return {
    surveyCompletedDate: dateSurveyCompleted ? dateSurveyCompleted[1] : null,
    surveyStartDate: surveyRange ? surveyRange[1] : null,
    surveyEndDate: surveyRange ? surveyRange[2] : null,
  };
}

export async function POST(request) {
  try {
    const { fileId } = await request.json();
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

    return Response.json({
      success: true,
      fileName: ocrData.fileName,
      intakeNumberFromPdf,
      deficienciesFound: deficiencies.length > 0,
      deficiencies,
      ftags: deficiencies.map((d) => `${d.ftag} - ${d.scopeSeverity}`),
      scopeSeverity: deficiencies.map((d) => d.scopeSeverity),
      surveyCompletedDate: dates.surveyCompletedDate,
      surveyStartDate: dates.surveyStartDate,
      surveyEndDate: dates.surveyEndDate,
      textLength: text.length,
      textPreview: text.slice(0, 20000),
      ocrSource: "Google Drive OCR",
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
