async function getData() {
  const res = await fetch(
    "https://survey-enforcement-dashboard.vercel.app/api/jotform",
    { cache: "no-store" }
  );

  return res.json();
}

export default async function Home() {
  const data = await getData();

  const submissions = data.content || [];

  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial",
        background: "#f4f7fb",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "40px",
          marginBottom: "30px",
        }}
      >
        Survey Enforcement Dashboard
      </h1>

      {submissions.map((submission) => {
        const answers = submission.answers;

        return (
          <div
            key={submission.id}
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "16px",
              marginBottom: "20px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ marginBottom: "10px" }}>
              {answers["3"]?.answer || "Unknown Facility"}
            </h2>

            <p>
              <strong>Survey Type:</strong>{" "}
              {answers["4"]?.answer || "N/A"}
            </p>

            <p>
              <strong>Intake Number:</strong>{" "}
              {answers["6"]?.answer || "N/A"}
            </p>

            <p>
              <strong>Survey Entrance:</strong>{" "}
              {answers["5"]?.prettyFormat || "N/A"}
            </p>

            <p>
              <strong>Last Day of Survey:</strong>{" "}
              {answers["67"]?.prettyFormat || "N/A"}
            </p>

            <p>
              <strong>DPNA Date:</strong>{" "}
              {answers["68"]?.prettyFormat || "N/A"}
            </p>

            <p>
              <strong>Termination Date:</strong>{" "}
              {answers["69"]?.prettyFormat || "N/A"}
            </p>

            <p>
              <strong>Enforcement Cycle:</strong>{" "}
              {answers["71"]?.answer || "N/A"}
            </p>

            <p>
              <strong>Deficiency:</strong>{" "}
              {answers["74"]?.answer || "N/A"}
            </p>
          </div>
        );
      })}
    </main>
  );
}
