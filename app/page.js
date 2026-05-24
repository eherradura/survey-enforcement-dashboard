"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [submissions, setSubmissions] = useState([]);
  const [driveData, setDriveData] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("All Facilities");
  const [selectedYear, setSelectedYear] = useState("All Years");
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

  function getYearFromSubmission(submission) {
    const answers = submission.answers;

    const possibleDates = [
      getAnswer(answers, "5"),
      getAnswer(answers, "67"),
      getAnswer(answers, "68"),
      getAnswer(answers, "69"),
      getAnswer(answers, "70"),
    ];

    for (const value of possibleDates) {
      const match = String(value || "").match(/\b(20\d{2})\b/);
      if (match) return match[1];
    }

    return "Unknown Year";
  }

  function getComments(answers) {
    const directComment = getAnswer(answers, "10");

    if (
      directComment &&
      directComment !== "No information available" &&
      String(directComment).trim() !== ""
    ) {
      return directComment;
    }

    const commentField = Object.values(answers || {}).find((field) => {
      return String(field?.name || "").toLowerCase().includes("comment");
    });

    return commentField?.answer || "No comments entered";
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

  function getDocumentStatus(documents) {
    if (!documents || documents.length === 0) {
      return {
        label: "Missing Documents",
        style: styles.missingBadge,
        missingItems: ["Regulatory documents"],
      };
    }

    const names = documents.map((file) => (file.name || "").toLowerCase());

    const hasCoverLetter = names.some(
      (name) => name.includes("cover") || name.includes("letter")
    );

    const hasSurveyDocument = names.some(
      (name) =>
        name.includes("2567") ||
        name.includes("annual") ||
        name.includes("survey") ||
        name.includes("deficiency")
    );

    const missingItems = [];

    if (!hasCoverLetter) {
      missingItems.push("Cover Letter");
    }

    if (!hasSurveyDocument) {
      missingItems.push("CMS-2567 / Survey Document");
    }

    if (missingItems.length > 0) {
      return {
        label: `Missing: ${missingItems.join(", ")}`,
        style: styles.warningBadge,
        missingItems,
      };
    }

    return {
      label: "Documents Complete",
      style: styles.uploadedBadge,
      missingItems: [],
    };
  }

  async function viewFindings(fileId, key) {
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

  const years = useMemo(() => {
    const extractedYears = submissions
      .map((submission) => getYearFromSubmission(submission))
      .filter(Boolean);

    return ["All Years", ...Array.from(new Set(extractedYears)).sort().reverse()];
  }, [submissions]);

  const filteredSubmissions = submissions.filter((submission) => {
    const facilityMatches =
      selectedFacility === "All Facilities" ||
      submission.answers?.["3"]?.answer === selectedFacility;

    const yearMatches =
      selectedYear === "All Years" ||
      getYearFromSubmission(submission) === selectedYear;

    return facilityMatches && yearMatches;
  });

  function getParsedFindingsForSubmission(submissionId) {
    return Object.entries(parsedDocs)
      .filter(([key]) => key.startsWith(`${submissionId}-`))
      .map(([, value]) => value)
      .filter((parsed) => parsed && parsed.success !== false);
  }

  const eventsWithFindings = filteredSubmissions.filter((submission) => {
    const parsedFindings = getParsedFindingsForSubmission(submission.id);

    return parsedFindings.some(
      (parsed) => parsed.deficiencies && parsed.deficiencies.length > 0
    );
  }).length;

  const severitySummary = filteredSubmissions.reduce((summary, submission) => {
    const parsedFindings = getParsedFindingsForSubmission(submission.id);

    parsedFindings.forEach((parsed) => {
      (parsed.deficiencies || []).forEach((deficiency) => {
        const severity = deficiency.scopeSeverity || "Unknown";
        summary[severity] = (summary[severity] || 0) + 1;
      });
    });

    return summary;
  }, {});

  const severityOrder = [
    "L",
    "K",
    "J",
    "I",
    "H",
    "G",
    "F",
    "E",
    "D",
    "C",
    "B",
    "A",
    "Unknown",
  ];

  const severitySummaryText = severityOrder
    .filter((severity) => severitySummary[severity])
    .map((severity) => `${severity}: ${severitySummary[severity]}`)
    .join(" • ");

  const surveyTypeBreakdown = filteredSubmissions.reduce((summary, submission) => {
    const surveyType = getAnswer(submission.answers, "4") || "Unknown";
    summary[surveyType] = (summary[surveyType] || 0) + 1;
    return summary;
  }, {});

  const surveyTypeBreakdownText = Object.entries(surveyTypeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type}: ${count}`)
    .join(" • ");

  return (
    <main style={styles.page}>
      <div style={styles.backgroundAccentOne}></div>
      <div style={styles.backgroundAccentTwo}></div>
      <div style={styles.backgroundGrid}></div>

      <section style={styles.header}>
        <h1 style={styles.title}>Survey Dashboard</h1>
      </section>

      <section style={styles.controlPanel}>
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.label}>Facility</label>
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

          <div>
            <label style={styles.label}>Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={styles.select}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.tileGrid}>
          <div style={styles.eventTile}>
            <p style={styles.eventTileLabel}>Survey Events</p>
            <h2 style={styles.eventTileNumber}>{filteredSubmissions.length}</h2>
            <p style={styles.breakdownText}>
              {surveyTypeBreakdownText || "No survey activity"}
            </p>
          </div>

          <div style={styles.eventTile}>
            <p style={styles.eventTileLabel}>Events With Findings</p>
            <h2 style={styles.eventTileNumber}>{eventsWithFindings}</h2>
          </div>

          <div style={styles.eventTileWide}>
            <p style={styles.eventTileLabel}>Severity Summary</p>
            <h2 style={styles.severityText}>
              {severitySummaryText || "No findings reviewed yet"}
            </h2>
          </div>
        </div>
      </section>

      {filteredSubmissions.map((submission) => {
        const answers = submission.answers;
        const documents = getRelevantDocumentsForSubmission(submission.id);
        const documentStatus = getDocumentStatus(documents);
        const comments = getComments(answers);

        return (
          <section key={submission.id} style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <h2 style={styles.facilityName}>{getAnswer(answers, "3")}</h2>
                <p style={styles.meta}>
                  {getAnswer(answers, "4")} • Intake #{getAnswer(answers, "6")}
                </p>
                <p style={styles.submissionId}>Submission ID: {submission.id}</p>
              </div>

              <span style={documentStatus.style}>{documentStatus.label}</span>
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Survey Entrance</span>
                <p style={styles.detailValue}>{getAnswer(answers, "5")}</p>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Last Day of Survey</span>
                <p style={styles.detailValue}>{getAnswer(answers, "67")}</p>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>DPNA Date</span>
                <p style={styles.detailValue}>{getAnswer(answers, "68")}</p>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Termination Date</span>
                <p style={styles.detailValue}>{getAnswer(answers, "69")}</p>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Completion Date</span>
                <p style={styles.detailValue}>{getAnswer(answers, "70")}</p>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Enforcement Cycle</span>
                <p style={styles.detailValue}>{getAnswer(answers, "71")}</p>
              </div>

              <div style={styles.commentsItem}>
                <span style={styles.detailLabel}>Comments</span>
                <p style={styles.commentValue}>{comments}</p>
              </div>
            </div>

            <div style={styles.documentsSection}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Documents</h3>
              </div>

              {documentStatus.missingItems.length > 0 && (
                <div style={styles.missingDocumentBox}>
                  <strong>Missing:</strong> {documentStatus.missingItems.join(", ")}
                </div>
              )}

              {documents.length === 0 ? (
                <p style={styles.noDocs}>
                  No cover letter, CMS-2567, life safety survey, enforcement letter,
                  or related regulatory document has been matched to this survey event yet.
                </p>
              ) : (
                <div style={styles.documentList}>
                  {documents.map((file) => {
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
                            onClick={() => viewFindings(file.fileId, key)}
                            style={styles.parseButton}
                          >
                            {loadingDoc === key
                              ? "Reviewing..."
                              : "View Findings"}
                          </button>
                        </div>

                        {parsed && (
                          <div style={styles.parseResult}>
                            {parsed.success === false && (
                              <p style={styles.errorText}>
                                <strong>Findings Error:</strong>{" "}
                                {parsed.error || "Unknown error"}
                              </p>
                            )}

                            <p style={styles.findingLine}>
                              <strong>Intake Number From PDF:</strong>{" "}
                              {parsed.intakeNumberFromPdf || "Not found"}
                            </p>

                            {parsed.deficiencies?.length > 0 ? (
                              <div style={styles.deficiencyList}>
                                <strong>Deficiency Detail:</strong>
                                <div style={styles.pillWrap}>
                                  {parsed.deficiencies.map((def, defIndex) => (
                                    <div
                                      key={defIndex}
                                      style={styles.deficiencyPill}
                                    >
                                      {def.ftag}
                                      {def.scopeSeverity
                                        ? ` - ${def.scopeSeverity}`
                                        : " - Scope/Severity not found"}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p style={styles.findingLine}>
                                <strong>Deficiency:</strong> No deficiency
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background: "#f4f7fb",
    padding: "34px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#0f172a",
  },

  backgroundAccentOne: {
    position: "fixed",
    width: "520px",
    height: "520px",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.10)",
    top: "-220px",
    right: "-160px",
    filter: "blur(10px)",
    pointerEvents: "none",
  },

  backgroundAccentTwo: {
    position: "fixed",
    width: "460px",
    height: "460px",
    borderRadius: "999px",
    background: "rgba(14, 165, 233, 0.08)",
    bottom: "-220px",
    left: "-180px",
    filter: "blur(12px)",
    pointerEvents: "none",
  },

  backgroundGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 70%)",
    pointerEvents: "none",
  },

  header: {
    position: "relative",
    background:
      "linear-gradient(135deg, rgba(15, 42, 74, 0.98), rgba(30, 64, 115, 0.95))",
    color: "white",
    padding: "42px",
    borderRadius: "30px",
    marginBottom: "22px",
    boxShadow: "0 22px 55px rgba(15, 42, 74, 0.24)",
    border: "1px solid rgba(255,255,255,0.16)",
  },

  title: {
    fontSize: "54px",
    lineHeight: 1,
    letterSpacing: "-1.8px",
    margin: 0,
    fontWeight: "800",
  },

  controlPanel: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "18px",
    marginBottom: "22px",
  },

  filterGrid: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    padding: "20px",
    borderRadius: "24px",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
  },

  label: {
    display: "block",
    fontWeight: "800",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    marginBottom: "8px",
  },

  select: {
    padding: "13px 14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    background: "white",
    fontSize: "15px",
    minWidth: "260px",
    outline: "none",
  },

  tileGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.4fr",
    gap: "16px",
  },

  eventTile: {
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: "22px",
    borderRadius: "24px",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
  },

  eventTileWide: {
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: "22px",
    borderRadius: "24px",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
  },

  eventTileLabel: {
    margin: 0,
    color: "#64748b",
    fontWeight: "800",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  eventTileNumber: {
    fontSize: "46px",
    margin: "6px 0 0",
    letterSpacing: "-1px",
  },

  breakdownText: {
    margin: "10px 0 0",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.45,
    fontWeight: "700",
  },

  severityText: {
    fontSize: "28px",
    margin: "12px 0 0",
    letterSpacing: "-0.5px",
  },

  card: {
    position: "relative",
    background: "rgba(255,255,255,0.90)",
    backdropFilter: "blur(12px)",
    padding: "26px",
    borderRadius: "28px",
    marginBottom: "22px",
    boxShadow: "0 16px 38px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "22px",
    alignItems: "flex-start",
  },

  facilityName: {
    margin: 0,
    fontSize: "30px",
    letterSpacing: "-0.5px",
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
    fontWeight: "800",
    height: "fit-content",
    whiteSpace: "nowrap",
  },

  warningBadge: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "800",
    height: "fit-content",
    whiteSpace: "nowrap",
  },

  missingBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "800",
    height: "fit-content",
    whiteSpace: "nowrap",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "1px",
    background: "#e2e8f0",
    borderRadius: "20px",
    overflow: "hidden",
    marginBottom: "22px",
    border: "1px solid #e2e8f0",
  },

  detailItem: {
    background: "#f8fafc",
    padding: "18px",
    minHeight: "86px",
  },

  commentsItem: {
    gridColumn: "1 / -1",
    background: "#f8fafc",
    padding: "18px",
  },

  detailLabel: {
    display: "block",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    fontWeight: "800",
    marginBottom: "8px",
  },

  detailValue: {
    margin: 0,
    fontSize: "16px",
    color: "#0f172a",
  },

  commentValue: {
    margin: 0,
    fontSize: "15px",
    color: "#334155",
    lineHeight: 1.55,
  },

  documentsSection: {
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "22px",
    border: "1px solid #e2e8f0",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "21px",
  },

  noDocs: {
    color: "#64748b",
    lineHeight: 1.5,
  },

  missingDocumentBox: {
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "14px",
  },

  documentList: {
    display: "grid",
    gap: "14px",
  },

  documentBox: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "16px",
  },

  documentHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
  },

  documentName: {
    margin: 0,
    fontWeight: "800",
    fontSize: "16px",
  },

  pdfBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "800",
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
    borderRadius: "12px",
    textDecoration: "none",
    fontWeight: "800",
  },

  parseButton: {
    background: "#111827",
    color: "white",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "none",
    fontWeight: "800",
    cursor: "pointer",
  },

  parseResult: {
    marginTop: "14px",
    padding: "14px",
    background: "#eef4ff",
    borderRadius: "14px",
    border: "1px solid #dbeafe",
  },

  errorText: {
    color: "#991b1b",
  },

  findingLine: {
    margin: "0 0 10px",
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
    fontWeight: "800",
  },
};
