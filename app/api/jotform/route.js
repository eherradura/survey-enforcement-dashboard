export async function GET() {
  const apiKey = process.env.JOTFORM_API_KEY;
  const formId = process.env.JOTFORM_FORM_ID;

  const response = await fetch(
    `https://hipaa-api.jotform.com/form/${formId}/submissions?apiKey=${apiKey}&limit=1000`
  );

  const data = await response.json();

  return Response.json(data);
}
