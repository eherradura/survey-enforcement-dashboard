export const runtime = "nodejs";

export async function GET() {
  try {
    const driveConnectorUrl = process.env.DRIVE_CONNECTOR_URL;

    if (!driveConnectorUrl) {
      return Response.json({
        success: false,
        error: "Missing DRIVE_CONNECTOR_URL",
      });
    }

    const response = await fetch(`${driveConnectorUrl}?action=analysis`, {
      cache: "no-store",
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      return Response.json(data);
    } catch {
      return Response.json({
        success: false,
        error: "Could not parse Apps Script analysis response",
        rawResponse: text.slice(0, 1000),
      });
    }
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
