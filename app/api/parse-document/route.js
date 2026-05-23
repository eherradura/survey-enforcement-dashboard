export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { fileUrl } = await request.json();
    const apiKey = process.env.OCR_SPACE_API_KEY;

    if (!fileUrl) {
      return Response.json({ error: "Missing fileUrl" }, { status: 400 });
    }

    const ocrUrl = `https://api.ocr.space/parse/imageurl?apikey=${apiKey}&url=${encodeURIComponent(
      fileUrl
    )}&language=eng&isOverlayRequired=false&detectOrientation=true&scale=true&OCREngine=2`;

    const response = await fetch(ocrUrl);
    const data = await response.json();

    const text =
      data?.ParsedResults?.map((r) => r.ParsedText).join("\n") || "";

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
      ...cleanText.matchAll(/\bF\s?0?(\d{3})\b.{0,80}?(SS\s*=\s*|Scope\s*Severity\s*)?([A-L])/gi),
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
      rawOcrMessage: data?.OCRExitCode,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
