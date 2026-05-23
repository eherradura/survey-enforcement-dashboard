export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { fileUrl } = await request.json();
    const apiKey = process.env.OCR_SPACE_API_KEY;

    if (!fileUrl) {
      return Response.json(
        { success: false, error: "Missing fileUrl" },
        { status: 400 }
      );
    }

    // Download PDF from Jotform
    const pdfResponse = await fetch(fileUrl);

    if (!pdfResponse.ok) {
      return Response.json({
        success: false,
        error: "Unable to download PDF",
      });
    }

    const pdfBlob = await pdfResponse.blob();

    // Create form data for OCR upload
    const formData = new FormData();

    formData.append("apikey", apiKey);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    formData.append(
      "file",
      pdfBlob,
      "survey.pdf"
    );

    // Send actual file to OCR API
    const ocrResponse = await fetch(
      "https://api.ocr.space/parse/image",
      {
        method: "POST",
        body: formData,
      }
    );

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

    const deficiencyMatches = [
      ...cleanText.matchAll(
        /\bF\s?0?(\d{3})\b.{0,80}?(SS\s*=\s*|Scope\s*Severity\s*)?([A-L])/gi
      ),
    ].map((m) => ({
      ftag: `F${m[1]}`,
      scopeSeverity: m[3],
    }));

    const unique = [];
    const seen = new Set();

    for (const item of deficiencyMatches) {
      const key = `${item.ftag}-${item.scopeSeverity}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return Response.json({
      success: true,
      intakeNumberFromPdf,
      deficienciesFound: unique.length > 0,
      deficiencies: unique,
      ftags: unique.map((d) => d.ftag),
      scopeSeverity: unique.map((d) => d.scopeSeverity),
      textPreview: cleanText.slice(0, 3000),
      rawOcrData: ocrData,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
