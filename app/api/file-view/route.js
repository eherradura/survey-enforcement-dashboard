export const runtime = "nodejs";

function base64ToBuffer(base64) {
  const cleanBase64 = String(base64 || "").replace(/^data:.*?;base64,/, "");
  return Buffer.from(cleanBase64, "base64");
}

function getAppsScriptUrl() {
  return (
    process.env.GOOGLE_SCRIPT_URL ||
    process.env.APPS_SCRIPT_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const fileNameFromUrl = searchParams.get("fileName") || "document.pdf";

    if (!fileId) {
      return new Response("Missing fileId", { status: 400 });
    }

    const appsScriptUrl = getAppsScriptUrl();

    if (!appsScriptUrl) {
      return new Response(
        "Missing Apps Script URL environment variable. Add GOOGLE_SCRIPT_URL or APPS_SCRIPT_URL in Vercel.",
        { status: 500 }
      );
    }

    const scriptUrl = new URL(appsScriptUrl);
    scriptUrl.searchParams.set("action", "file");
    scriptUrl.searchParams.set("fileId", fileId);

    const scriptResponse = await fetch(scriptUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!scriptResponse.ok) {
      const errorText = await scriptResponse.text();

      return new Response(
        `Unable to retrieve file from Apps Script. ${errorText}`,
        { status: 502 }
      );
    }

    const data = await scriptResponse.json();

    if (!data.success && !data.base64) {
      return new Response(
        data.error || "Apps Script did not return a file.",
        { status: 502 }
      );
    }

    const base64 = data.base64 || data.fileBase64 || data.content;
    const fileName = data.fileName || data.name || fileNameFromUrl;
    const mimeType = data.mimeType || "application/pdf";

    if (!base64) {
      return new Response("No base64 file content returned.", { status: 502 });
    }

    const buffer = base64ToBuffer(base64);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName.replaceAll('"', "")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return new Response(error.message || "Unable to view file.", {
      status: 500,
    });
  }
}
