export const runtime = "nodejs";

function normalizeText(text) {
  return (text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
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

function extractDeficiencies(text) {
  const deficiencies = [];
  const seen = new Set();

  /*
    CMS-2567 usually appears like:
    F0689
    SS = E

    We only accept scope/severity if we see an actual SS pattern.
    This avoids false matches like:
    F689 Free of Accident Hazards/Supervision/Devices
    where random letters get picked up incorrectly.
  */

  const sectionRegex = /\bF\s*0?(\d{3})\b([\s\S]{0,300}?)(?=\bF\s*0?\d{3}\b|$)/gi;

  for (const match of text.matchAll(sectionRegex)) {
    const ftag = normalizeFtag(match[1]);

    if (ftag === "F000") {
      continue;
    }

    const sectionText = match[2] || "";

    const ssMatch =
      sectionText.match(/\bSS\s*[:=]\s*([A-L])\b/i) ||
      sectionText.match(/\bS\/S\s*[:=]\s*([A-L])\b/i) ||
      sectionText.match(/\bScope\s*\/?\s*Severity\s*[:=]\s*([A-L])\b/i);

    const scopeSeverity = ssMatch ? ssMatch[1].toUpperCase() : null;

    const key = `${ftag}-${scopeSeverity || "NONE"}`;

    if (!seen.has(key)) {
      seen.add(key);
      deficiencies.push({
        ftag,
        scopeSeverity,
      });
    }
  }

  /*
    Backup pattern for OCR text that keeps F-tag and SS together:
    F0689 SS = E
  */

  const directRegex =
    /\bF\s*0?(\d{3})\b\s*(?:\n|\s|.){0,80}?\b(?:SS|S\/S)\s*[:=]\s*([A-L])\b/gi;

  for (const match of text.matchAll(directRegex)) {
    const ftag = normalizeFtag(match[1]);

    if (ftag === "F000") {
      continue;
    }

    const scopeSeverity = match[2].toUpperCase();
    const key = `${ftag}-${scopeSeverity}`;

    if (!seen.has(key)) {
      seen.add(key);
      deficiencies.push({
        ftag,
        scopeSeverity,
      });
    }
  }

  /*
    If F-tags are found but no SS is found, include the tag with no SS.
    But still ignore F000.
  */

  const allFtagRegex = /\bF\s*0?(\d{3})\b/gi;

  for (const match of text.matchAll(allFtagRegex)) {
    const ftag = normalizeFtag(match[1]);

    if (ftag === "F000") {
      continue;
    }

    const alreadyExists = deficiencies.some((d) => d.ftag === ftag);

    if (!alreadyExists) {
      deficiencies.push({
        ftag,
        scopeSeverity: null,
      });
    }
  }

  /*
    Sort by scope/severity:
    L highest → A lowest.
    If same severity, sort by F-tag number.
    If no SS, push to the bottom.
  */

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

function extractIntakeNumber(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  const isRecertification =
    /recertification|re\s*certification|annual survey|standard survey/i.test(
      cleanText
    );

  if (isRecertification) {
    return "Recertification";
  }

  const intakeMatch =
    cleanText.match(/intake\s*(number|#)?\s*[:#]?\s*([A-Z0-9-]+)/i) ||
    cleanText.match(/\bCA\d{2,}\b/i);

  if (!intakeMatch) {
    return null;
  }

  return intakeMatch[2] || intakeMatch[0];
}

export async function POST(request) {
  try {
    const { fileId } = await request.json();
    const driveConnectorUrl = process.env.DRIVE_CONNECTOR_URL;
    const apiKey = process.env.OCR_SPACE_API_KEY;

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

    if (!apiKey) {
      return Response.json({
        success: false,
        error: "Missing OCR_SPACE_API_KEY",
      });
    }

    const fileResponse = await fetch(
      `${driveConnectorUrl}?action=file&fileId=${encodeURIComponent(fileId)}`,
      { cache: "no-store" }
    );

    const fileData = await fileResponse.json();

    if (!fileData.success || !fileData.base64) {
      return Response.json({
        success: false,
        error: "Could not retrieve file from Google Drive connector",
        fileData,
      });
    }

    const fileBuffer = Buffer.from(fileData.base64, "base64");

    const pdfBlob = new Blob([fileBuffer], {
      type: fileData.mimeType || "application/pdf",
    });

    const formData = new FormData();
    formData.append("apikey", apiKey);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");
    formData.append("file", pdfBlob, fileData.fileName || "survey.pdf");

    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const ocrData = await ocrResponse.json();

    const rawText =
      ocrData?.ParsedResults?.map((r) => r.ParsedText).join("\n") || "";

    const text = normalizeText(rawText);
    const deficiencies = extractDeficiencies(text);
    const intakeNumberFromPdf = extractIntakeNumber(text);

    return Response.json({
      success: true,
      fileName: fileData.fileName,
      intakeNumberFromPdf,
      deficienciesFound: deficiencies.length > 0,
      deficiencies,
      ftags: deficiencies.map((d) =>
        d.scopeSeverity ? `${d.ftag} - ${d.scopeSeverity}` : d.ftag
      ),
      scopeSeverity: deficiencies
        .map((d) => d.scopeSeverity)
        .filter(Boolean),
      textPreview: text.slice(0, 6000),
      rawOcrData: ocrData,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
