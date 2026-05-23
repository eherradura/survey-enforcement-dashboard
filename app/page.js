"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("All Facilities");

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
        const selectedKey = String(field.answer)
          .replace("{", "")
          .replace("}", "");

        return options[selectedKey]?.value || field.answer;
      } catch {
        return field.answer;
      }
    }

    return field.answer || "No information available";
  }

  function getUploads(answers) {
    const uploads = answers?.["72"]?.answer;

    if (!uploads || !Array.isArray(uploads)) {
      return [];
    }

    return uploads;
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
      : submissions.filter(
          (s) => s.answers?.["3"]?.answer === selectedFacility
        );

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>Survey Enforcement Dashboard</h1>

        <p style={styles.subtitle}>
          Live survey activity pulled directly from Jotform.
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
                <h2 style={styles.facilityName}>
                  {getAnswer(answers, "3")}
                </h2>

                <p style={styles.meta}>
                  {getAnswer(answers, "4")} • Intake #
                  {getAnswer(answers, "6")}
                </p>
              </div>

              <div>
                {uploads.length > 0 ? (
                  <span style={styles.uploadedBadge}>
                    {uploads.length} Document(s) Uploaded
                  </span>
                ) : (
                  <span style={styles.missingBadge}>
                    No Documents Uploaded
                  </span>
                )}
              </div>
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
                uploads.map((file, index) => (
                  <a
                    key={index}
                    href={file}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.documentLink}
                  >
                    View PDF {index + 1}
                  </a>
                ))
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
  },

  missingBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "bold",
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
};
