export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { fileUrl } = await request.json();

    const response = await fetch(fileUrl);

    const contentType = response.headers.get("content-type");
    const text = await response.text();

    return Response.json({
      success: true,
      status: response.status,
      contentType,
      first500Characters: text.slice(0, 500),
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
