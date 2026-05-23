export const runtime = "nodejs";

export async function POST(request) {
  try {
    const pdfParseModule = await import("pdf-parse");
    const pdf = pdfParseModule.default || pdfParseModule;

    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return Response.json({ error: "Missing fileUrl" }, { status: 400 });
    }

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const parsed = await pdf(buffer);
    const text = parsed.text || "";

    const intakeMatch =
      text.match(/intake\s*(number|#)?\s*[:#]?\s*([A-Z0-9-]+)/i) ||
      text.match(/\bCA\d{2,}\b/i) ||
      text.match(/\b\d{6,8}\b/);

    const ftagMatches = [...text.matchAll(/\bF\s?(\d{3})\b/g)].map(
      (m) => `F${m[1]}`
    );

    const uniqueFtags = [...new Set(ftagMatches)];

    const scopeSeverityMatches = [
      ...text.matchAll(/scope\s*(and|&)?\s*severity\s*[:\-]?\s*([A-Z])/gi),
    ].map((m) => m[2]);

    return Response.json({
      success: true,
      intakeNumberFromPdf: intakeMatch ? intakeMatch[0] : null,
      deficienciesFound: uniqueFtags.length > 0,
      ftags: uniqueFtags,
      scopeSeverity: scopeSeverityMatches,
      textPreview: text.slice(0, 1000),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
