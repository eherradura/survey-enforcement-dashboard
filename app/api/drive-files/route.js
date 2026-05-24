export async function GET() {
  try {
    const url = process.env.DRIVE_CONNECTOR_URL;

    if (!url) {
      return Response.json({
        success: false,
        error: "Missing DRIVE_CONNECTOR_URL environment variable",
      });
    }

    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    let parsedData = null;

    try {
      parsedData = JSON.parse(rawText);
    } catch (jsonError) {
      return Response.json({
        success: false,
        error: "Google Apps Script did not return JSON",
        status: response.status,
        contentType,
        connectorUrlStartsWith: url.slice(0, 60),
        first1000CharactersReturned: rawText.slice(0, 1000),
      });
    }

    return Response.json(parsedData);
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
