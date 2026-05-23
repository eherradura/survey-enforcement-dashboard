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
    const cleanText = text.replace(/\s+/g, " ").trim();

    const isRecertification =
      /recertification|standard survey|annual survey/i.test(cleanText);

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
      ...cleanText.matchAll(/\bF\s?(\d{3})\b.{0,120}?\b([A-L])\b/gi),
    ].map((m) => ({
      ftag: `F${m[1]}`,
      scopeSeverity: m[2],
    }));

    const fallbackFtags = [...cleanText.matchAll(/\bF\s?(\d{3})\b/gi)].map(
      (m) => ({
        ftag: `F${m[1]}`,
        scopeSeverity: null,
      })
    );

    const merged = [...deficiencyMatches, ...fallbackFtags];

    const uniqueDeficiencies = [];
    const seen = new Set();

    for (const item of merged) {
      const key = `${item.ftag}-${item.scopeSeverity || ""}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueDeficiencies.push(item);
      }
    }

    return Response.json({
      success: true,
      intakeNumberFromPdf,
      deficienciesFound: uniqueDeficiencies.length > 0,
      deficiencies: uniqueDeficiencies,
      ftags: uniqueDeficiencies.map((d) => d.ftag),
      scopeSeverity: uniqueDeficiencies
        .map((d) => d.scopeSeverity)
        .filter(Boolean),
      textPreview: cleanText.slice(0, 2000),
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
