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

  const deficiencies = [];
  const seenByFtag = new Map();

  /*
    CMS-2567 usually appears like:
    F0689
    SS = E

    Sometimes OCR puts the SS on the same line, sometimes the next line.
    This checks the F-tag line plus nearby lines.
  */

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const ftagMatches = [...line.matchAll(/\bF\s*0?(\d{3})\b/gi)];

    for (const ftagMatch of ftagMatches) {
      const ftag = normalizeFtag(ftagMatch[1]);

      if (ftag === "F000") {
        continue;
      }

      const nearbyText = lines.slice(i, i + 8).join(" ");

      const ssMatch =
        nearbyText.match(/\bSS\s*[:=]\s*([A-L])\b/i) ||
        nearbyText.match(/\bS\/S\s*[:=]\s*([A-L])\b/i) ||
        nearbyText.match(/\bScope\s*\/?\s*Severity\s*[:=]\s*([A-L])\b/i);

      const scopeSeverity = ssMatch ? ssMatch[1].toUpperCase() : null;

      const existing = seenByFtag.get(ftag);

      if (!existing) {
        seenByFtag.set(ftag, {
          ftag,
          scopeSeverity,
        });
      } else if (
        scopeSeverity &&
        severityRank(scopeSeverity) > severityRank(existing.scopeSeverity)
      ) {
        seenByFtag.set(ftag, {
          ftag,
          scopeSeverity,
        });
      }
    }
  }

  /*
    Backup scan for OCR that flattened everything into one long line.
  */

  const flattened = normalized.replace(/\n/g, " ");

  const sectionRegex =
    /\bF\s*0?(\d{3})\b([\s\S]{0,500}?)(?=\bF\s*0?\d{3}\b|$)/gi;

  for (const match of flattened.matchAll(sectionRegex)) {
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

    const existing = seenByFtag.get(ftag);

    if (!existing) {
      seenByFtag.set(ftag, {
        ftag,
        scopeSeverity,
      });
    } else if (
      scopeSeverity &&
      severityRank(scopeSeverity) > severityRank(existing.scopeSeverity)
    ) {
      seenByFtag.set(ftag, {
        ftag,
        scopeSeverity,
      });
    }
  }

  deficiencies.push(...seenByFtag.values());

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
    formData.append("isTable", "true");
    formData.append("filetype", "PDF");
    formData.append("OCREngine", "2");
    formData.append("file", pdfBlob, fileData.fileName || "survey.pdf");

    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const ocrData = await ocrResponse.json();

    const parsedResults = ocrData?.ParsedResults || [];

    const rawText = parsedResults
      .map((result) => result.ParsedText || "")
      .join("\n\n--- PAGE BREAK ---\n\n");

    const text = normalizeText(rawText);

    const intakeNumberFromPdf = extractIntakeNumber(fileData.fileName, text);
    const deficiencies = extractDeficiencies(text);

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
      parsedResultCount: parsedResults.length,
      textLength: text.length,
      textPreview: text.slice(0, 12000),
      rawOcrData: ocrData,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
