"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [submissions, setSubmissions] = useState([]);
  const [driveData, setDriveData] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("All Facilities");
  const [parsedDocs, setParsedDocs] = useState({});
  const [loadingDoc, setLoadingDoc] = useState(null);

  useEffect(() => {
    async function loadData() {
      const jotformRes = await fetch("/api/jotform");
      const jotformData = await jotformRes.json();
      setSubmissions(jotformData.content || []);

      const driveRes = await fetch("/api/drive-files");
      const driveJson = await driveRes.json();
      setDriveData(driveJson.submissions || []);
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

  function getAllDocumentsForSubmission(submissionId) {
    const match = driveData.find(
      (folder) => String(folder.submissionId) === String(submissionId)
    );

    return match?.files || [];
  }

  function isJotformSubmissionPdf(file, submissionId) {
    const name = (file.name || "").toLowerCase().trim();

    if (name === `${submissionId}.pdf`.toLowerCase()) return true;

    // Filters generic Jotform-generated submission PDFs like 6538150687635847857.pdf
    if (/^\d+\.pdf$/i.test(name)) return true;

    return false;
  }

  function getRelevantDocumentsForSubmission(submissionId) {
    const allDocuments = getAllDocumentsForSubmission(submissionId);

    return allDocuments.filter((file) => {
      if (!file.name) return false;
      if (isJotformSubmissionPdf(file, submissionId)) return false;

      const name = file.name.toLowerCase();

      return (
        name.includes("2567") ||
        name.includes("cover") ||
        name.includes("letter") ||
        name.includes("annual") ||
        name.includes("survey") ||
        name.includes("life safety") ||
        name.includes("enforcement") ||
        name.includes("deficiency") ||
        name.includes("poc")
      );
    });
  }

  async function parsePdf(fileId, key) {
    setLoadingDoc(key);

    try {
      const res = await fetch("/api/parse-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });

      const data = await res.json();

      setParsedDocs((prev) => ({
        ...prev,
        [key]: data,
      }));
    } catch (error) {
      setParsedDocs((prev) => ({
        ...prev,
        [key]: {
          success: false,
          error: error.message,
        },
      }));
    }

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

  const totalRelevantDocuments = filteredSubmissions.reduce((count, submission) => {
    return count + getRelevantDocumentsForSubmission(submission.id).length;
  }, 0);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.kicker}>Survey Intelligence</p>
        <h1 style={styles.title}>Survey Enforcement Dashboard</h1>
        <p style={styles.subtitle}>
          Live survey activity from Jotform with matched regulatory documents and parsing.
        </p>
      </section>

      <section style={styles.filterSection}>
        <div>
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
        </div>
      </section>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Survey Records Shown</p>
          <h2 style={styles.statNumber}>{filteredSubmissions.length}</h2>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Regulatory Documents Matched</p>
          <h2 style={styles.statNumber}>{totalRelevantDocuments}</h2>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Submission Folders</p>
          <h2 style={styles.statNumber}>{driveData.length}</h2>
        </div>
      </section>

      {filteredSubmissions.map((submission) => {
        const answers = submission.answers;
        const documents = getRelevantDocumentsForSubmission(submission.id);

        return (
          <section key={submission.id} style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <h2 style={styles.facilityName}>{getAnswer(answers, "3")}</h2>
                <p style={styles.meta}>
                  {getAnswer(answers, "4")} • Intake #{getAnswer(answers, "6")}
                </p>
                <p style={styles.submissionId}>
                  Submission ID: {submission.id}
                </p>
              </div>

              {documents.length > 0 ? (
                <span style={styles.uploadedBadge}>Documents Available</span>
              ) : (
                <span style={styles.missingBadge}>Missing Documents</span>
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
              <h3 style={styles.sectionTitle}>Documents</h3>

              {documents.length === 0 ? (
                <div style={styles.missingDocumentBox}>
                  <strong>Missing documents</strong>
                  <p>
                    No cover letter, CMS-2567, life safety survey, enforcement letter,
                    or related regulatory document has been matched to this survey event yet.
                  </p>
                </div>
              ) : (
                documents.map((file) => {
                  const key = `${submission.id}-${file.fileId}`;
                  const parsed = parsedDocs[key];
                  const documentName = file.name || "Unnamed PDF";

                  return (
                    <div key={file.fileId} style={styles.documentBox}>
                      <div style={styles.documentHeader}>
                        <p style={styles.documentName}>{documentName}</p>
                        <span style={styles.pdfBadge}>PDF</span>
                      </div>

                      <div style={styles.buttonRow}>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.documentLink}
                        >
                          View File
                        </a>

                        <button
                          onClick={() => parsePdf(file.fileId, key)}
                          style={styles.parseButton}
                        >
                          {loadingDoc === key ? "Parsing..." : "Parse PDF"}
                        </button>
                      </div>

                      {parsed && (
                        <div style={styles.parseResult}>
                          {parsed.success === false && (
                            <p style={styles.errorText}>
                              <strong>Parser Error:</strong>{" "}
                              {parsed.error || "Unknown error"}
                            </p>
                          )}

                          <p>
                            <strong>Intake Number From PDF:</strong>{" "}
                            {parsed.intakeNumberFromPdf || "Not found"}
                          </p>

                          {parsed.deficiencies?.length > 0 ? (
                            <div style={styles.deficiencyList}>
                              <strong>Deficiency Detail:</strong>
                              <div style={styles.pillWrap}>
                                {parsed.deficiencies.map((def, defIndex) => (
                                  <div key={defIndex} style={styles.deficiencyPill}>
                                    {def.ftag}
                                    {def.scopeSeverity
                                      ? ` - ${def.scopeSeverity}`
                                      : " - Scope/Severity not found"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p>
                              <strong>Deficiency:</strong> No deficiency
                            </p>
                          )}
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
    background: "linear-gradient(135deg, #eef4ff 0%, #f8fafc 45%, #ffffff 100%)",
    padding: "40px",
    fontFamily: "Arial, sans-serif",
    color: "#102033",
  },

  hero: {
    background: "linear-gradient(135deg, #0f2a4a, #174f7a)",
    color: "white",
    padding: "36px",
    borderRadius: "28px",
    marginBottom: "24px",
    boxShadow: "0 18px 40px rgba(15, 42, 74, 0.25)",
  },

  kicker: {
    textTransform: "uppercase",
    letterSpacing: "2px",
    fontSize: "12px",
    opacity: 0.8,
    margin: 0,
  },

  title: {
    fontSize: "44px",
    margin: "8px 0",
  },

  subtitle: {
    maxWidth: "760px",
    fontSize: "17px",
    lineHeight: 1.5,
    opacity: 0.9,
  },

  filterSection: {
    background: "white",
    padding: "22px",
    borderRadius: "20px",
    marginBottom: "20px",
    boxShadow: "0 8px 24px rgba(15, 42, 74, 0.08)",
  },

  label: {
    display: "block",
    fontWeight: "700",
    marginBottom: "8px",
  },

  select: {
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    minWidth: "340px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },

  statCard: {
    background: "white",
    padding: "22px",
    borderRadius: "20px",
    boxShadow: "0 8px 24px rgba(15, 42, 74, 0.08)",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontWeight: "700",
  },

  statNumber: {
    fontSize: "38px",
    margin: "8px 0 0",
  },

  card: {
    background: "white",
    padding: "26px",
    borderRadius: "24px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(15, 42, 74, 0.09)",
    border: "1px solid #e5e7eb",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
  },

  facilityName: {
    margin: 0,
    fontSize: "28px",
  },

  meta: {
    color: "#64748b",
    marginTop: "6px",
    fontSize: "16px",
  },

  submissionId: {
    color: "#94a3b8",
    fontSize: "13px",
    marginTop: "4px",
  },

  uploadedBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "700",
    height: "fit-content",
  },

  missingBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "700",
    height: "fit-content",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "18px",
    marginBottom: "24px",
  },

  documentsSection: {
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "18px",
  },

  sectionTitle: {
    marginTop: 0,
  },

  missingDocumentBox: {
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa",
    borderRadius: "14px",
    padding: "16px",
  },

  documentBox: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "14px",
  },

  documentHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
  },

  documentName: {
    margin: 0,
    fontWeight: "700",
    fontSize: "16px",
  },

  pdfBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "700",
    height: "fit-content",
    fontSize: "12px",
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  documentLink: {
    display: "inline-block",
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

  errorText: {
    color: "#991b1b",
  },

  deficiencyList: {
    marginTop: "12px",
    marginBottom: "12px",
  },

  pillWrap: {
    marginTop: "8px",
  },

  deficiencyPill: {
    display: "inline-block",
    marginRight: "8px",
    marginBottom: "8px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "700",
  },
};
