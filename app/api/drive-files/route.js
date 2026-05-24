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
    });

    const data = await response.json();

    return Response.json(data);
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
