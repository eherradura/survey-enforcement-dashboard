export const runtime = "nodejs";

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

    const text =
      ocrData?.ParsedResults?.map((r) => r.ParsedText).join("\n") || "";

    const cleanText = text.replace(/\s+/g, " ").trim();

    const isRecertification =
      /recertification|annual survey|standard survey/i.test(cleanText);

    const intakeMatch =
      cleanText.match(/intake\s*(number|#)?\s*[:#]?\s*([A-Z0-9-]+)/i) ||
      cleanText.match(/\bCA\d{2,}\b/i) ||
      cleanText.match(/\b\d{6,8}\b/);

    const intakeNumberFromPdf = isRecertification
      ? "Recertification"
      : intakeMatch
      ? intakeMatch[2] || intakeMatch[0]
      : null;

    const deficiencies = [];

    const ftagRegex = /\bF\s?0?(\d{3})\b.{0,120}?(?:SS\s*=\s*|S\/S\s*=\s*|scope\s*severity\s*)?([A-L])\b/gi;

    for (const match of cleanText.matchAll(ftagRegex)) {
      deficiencies.push({
        ftag: `F${match[1]}`,
        scopeSeverity: match[2],
      });
    }

    const simpleFtagRegex = /\bF\s?0?(\d{3})\b/gi;

    for (const match of cleanText.matchAll(simpleFtagRegex)) {
      const ftag = `F${match[1]}`;
      if (!deficiencies.some((d) => d.ftag === ftag)) {
        deficiencies.push({
          ftag,
          scopeSeverity: null,
        });
      }
    }

    const unique = [];
    const seen = new Set();

    for (const item of deficiencies) {
      const key = `${item.ftag}-${item.scopeSeverity || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return Response.json({
      success: true,
      fileName: fileData.fileName,
      intakeNumberFromPdf,
      deficienciesFound: unique.length > 0,
      deficiencies: unique,
      ftags: unique.map((d) => d.ftag),
      scopeSeverity: unique.map((d) => d.scopeSeverity).filter(Boolean),
      textPreview: cleanText.slice(0, 4000),
      rawOcrData: ocrData,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
