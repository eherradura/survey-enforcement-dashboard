
export async function GET(request) {
  return new Response(
    JSON.stringify({
      message: "Jotform API route working"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
