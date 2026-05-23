"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("All Facilities");
  const [parsedDocs, setParsedDocs] = useState({});
  const [loadingDoc, setLoadingDoc] = useState(null);

  useEffect(() => {
    async function loadData() {
      const res = await fetch("/api/jotform");
      const data = await res.json();
      setSubmissions(data.content || []);
    }

    loadData();
  }, []);

  function getAnswer(answers, id) {
    const field = answers?.[id];

    if (!field) return "No information available";
    if (field.prettyFormat) return field.prettyFormat;

    if (field.options_array && field.answer) {
      try {
        const options = JSON.parse(field.options_array);
        const selectedKey = String(field.answer).replace("{", "").replace("}", "");
        return options[selectedKey]?.value || field.answer;
      } catch {
        return field.answer;
      }
    }

    return field.answer || "No information available";
  }

  function getUploads(answers) {
    const uploads = answers?.["72"]?.answer;
    return Array.isArray(uploads) ? uploads : [];
  }

  async function parsePdf(fileUrl, key) {
    setLoadingDoc(key);

    const res = await fetch("/api/parse-document", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileUrl }),
    });

    const data = await res.json();

    setParsedDocs((prev) => ({
      ...prev,
      [key]: data,
    }));

    setLoadingDoc(null);
  }

  const facilities = useMemo(() => {
    const names = submissions
      .map((s) => s.answers?.["3"]?.answer)
      .filter(Boolean);

    return ["All Facilities", ...Array.from(new Set(names)).sort()];
  }, [submissions]);

  const filteredSubmissions =
    selectedFacility === "All Facilities"
      ? submissions
      : submissions.filter((s) => s.answers?.["3"]?.answer === selectedFacility);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>Survey Enforcement Dashboard</h1>
        <p style={styles.subtitle}>
          Live survey activity pulled from Jotform with document parsing support.
        </p>
      </section>

      <section style={styles.filterSection}>
        <label style={styles.label}>Select Facility</label>
        <select
          value={selectedFacility}
          onChange={(e) => setSelectedFacility(e.target.value)}
          style={styles.select}
        >
          {facilities.map((facility) => (
            <option key={facility} value={facility}>
              {facility}
            </option>
          ))}
        </select>
      </section>

      {filteredSubmissions.map((submission) => {
        const answers = submission.answers;
        const uploads = getUploads(answers);

        return (
          <section key={submission.id} style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <h2 style={styles.facilityName}>{getAnswer(answers, "3")}</h2>
                <p style={styles.meta}>
                  {getAnswer(answers, "4")} • Intake #{getAnswer(answers, "6")}
                </p>
              </div>

              {uploads.length > 0 ? (
                <span style={styles.uploadedBadge}>
                  {uploads.length} Document(s) Uploaded
                </span>
              ) : (
                <span style={styles.missingBadge}>No Documents Uploaded</span>
              )}
            </div>

            <div style={styles.grid}>
              <div>
                <strong>Survey Entrance</strong>
                <p>{getAnswer(answers, "5")}</p>
              </div>
              <div>
                <strong>Last Day of Survey</strong>
                <p>{getAnswer(answers, "67")}</p>
              </div>
              <div>
                <strong>DPNA Date</strong>
                <p>{getAnswer(answers, "68")}</p>
              </div>
              <div>
                <strong>Termination Date</strong>
                <p>{getAnswer(answers, "69")}</p>
              </div>
              <div>
                <strong>Completion Date</strong>
                <p>{getAnswer(answers, "70")}</p>
              </div>
              <div>
                <strong>Enforcement Cycle</strong>
                <p>{getAnswer(answers, "71")}</p>
              </div>
            </div>

            <div style={styles.documentsSection}>
              <h3>Uploaded Documents</h3>

              {uploads.length === 0 ? (
                <p>No uploaded documents found.</p>
              ) : (
                uploads.map((file, index) => {
                  const key = `${submission.id}-${index}`;
                  const parsed = parsedDocs[key];

                  return (
                    <div key={key} style={styles.documentBox}>
                      <a
                        href={file}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.documentLink}
                      >
                        View PDF {index + 1}
                      </a>

                      <button
                        onClick={() => parsePdf(file, key)}
                        style={styles.parseButton}
                      >
                        {loadingDoc === key ? "Parsing..." : "Parse PDF"}
                      </button>

                      {parsed && (
                        <div style={styles.parseResult}>
                          <p>
                            <strong>Intake Number From PDF:</strong>{" "}
                            {parsed.intakeNumberFromPdf || "Not found"}
                          </p>

                          <p>
                            <strong>Deficiencies Found:</strong>{" "}
                            {parsed.deficienciesFound ? "Yes" : "No"}
                          </p>

                          <p>
                            <strong>F-Tags:</strong>{" "}
                            {parsed.ftags?.length ? parsed.ftags.join(", ") : "None found"}
                          </p>

                          <p>
                            <strong>Scope/Severity:</strong>{" "}
                            {parsed.scopeSeverity?.length
                              ? parsed.scopeSeverity.join(", ")
                              : "None found"}
                          </p>

                          <details>
                            <summary>Text Preview</summary>
                            <pre style={styles.preview}>{parsed.textPreview}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "40px",
    fontFamily: "Arial",
  },
  hero: {
    marginBottom: "30px",
  },
  title: {
    fontSize: "48px",
    marginBottom: "10px",
  },
  subtitle: {
    fontSize: "18px",
    color: "#555",
  },
  filterSection: {
    background: "white",
    padding: "20px",
    borderRadius: "16px",
    marginBottom: "24px",
  },
  label: {
    display: "block",
    marginBottom: "10px",
    fontWeight: "bold",
  },
  select: {
    padding: "12px",
    borderRadius: "10px",
    minWidth: "300px",
  },
  card: {
    background: "white",
    padding: "24px",
    borderRadius: "20px",
    marginBottom: "24px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
    gap: "20px",
  },
  facilityName: {
    margin: 0,
    fontSize: "30px",
  },
  meta: {
    color: "#666",
  },
  uploadedBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "bold",
    height: "fit-content",
  },
  missingBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "bold",
    height: "fit-content",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },
  documentsSection: {
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "16px",
  },
  documentBox: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "14px",
  },
  documentLink: {
    display: "inline-block",
    marginRight: "12px",
    marginBottom: "12px",
    background: "#2563eb",
    color: "white",
    padding: "10px 14px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: "bold",
  },
  parseButton: {
    background: "#111827",
    color: "white",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },
  parseResult: {
    marginTop: "14px",
    padding: "14px",
    background: "#eef4ff",
    borderRadius: "12px",
  },
  preview: {
    whiteSpace: "pre-wrap",
    background: "#0f172a",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    maxHeight: "240px",
    overflow: "auto",
  },
};
