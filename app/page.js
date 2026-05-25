"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [submissions, setSubmissions] = useState([]);
  const [driveData, setDriveData] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("All Facilities");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedDocumentStatus, setSelectedDocumentStatus] = useState(
    "All Document Statuses"
  );
  const [parsedDocs, setParsedDocs] = useState({});
  const [loadingDoc, setLoadingDoc] = useState(null);
  const [savedAnalysisCount, setSavedAnalysisCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      const jotformRes = await fetch("/api/jotform");
      const jotformData = await jotformRes.json();
      setSubmissions(jotformData.content || []);

      const driveRes = await fetch("/api/drive-files");
      const driveJson = await driveRes.json();
      setDriveData(driveJson.submissions || []);

      await loadSavedAnalysis();
    }

    loadData();
  }, []);

  async function loadSavedAnalysis() {
    const analysisRes = await fetch("/api/saved-analysis");
    const analysisJson = await analysisRes.json();

    if (analysisJson.success && Array.isArray(analysisJson.analysis)) {
      const savedParsedDocs = {};

      analysisJson.analysis.forEach((record) => {
        const submissionId = String(record.submissionId || "");
        const fileId = String(record.fileId || "");

        if (!submissionId || !fileId) return;

        const key = `${submissionId}-${fileId}`;

        if (record.rawJsonParsed) {
          savedParsedDocs[key] = {
            ...record.rawJsonParsed,
            loadedFromSavedAnalysis: true,
            parsedAt: record.parsedAt || record.rawJsonParsed.savedAt || null,
          };
        } else {
          const deficiencies = String(record.deficiencySummary || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => {
              const parts = item.split("-").map((part) => part.trim());

              return {
                ftag: parts[0],
                scopeSeverity: parts[1] || null,
              };
            });

          savedParsedDocs[key] = {
            success: true,
            fileName: record.fileName || "",
            fileId,
            submissionId,
            facility: record.facility || "",
            surveyType: record.surveyType || "",
            intakeNumberFromPdf: record.intakeNumberFromPdf || null,
            deficienciesFound: record.deficienciesFound === "Yes",
            deficiencies,
            ftags: deficiencies.map((d) =>
              d.scopeSeverity ? `${d.ftag} - ${d.scopeSeverity}` : d.ftag
            ),
            scopeSeverity: deficiencies
              .map((d) => d.scopeSeverity)
              .filter(Boolean),
            severitySummary: record.severitySummary || "",
            loadedFromSavedAnalysis: true,
            parsedAt: record.parsedAt || null,
          };
        }
      });

      setParsedDocs(savedParsedDocs);
      setSavedAnalysisCount(analysisJson.count || 0);
    }
  }

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

  function parseFacilityDate(value) {
    if (!value || value === "No information available") return null;

    const text = String(value).trim();

    const mmddyyyy =
      text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/) ||
      text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

    if (mmddyyyy) {
      const month = Number(mmddyyyy[1]) - 1;
      const day = Number(mmddyyyy[2]);
      const year = Number(mmddyyyy[3]);
      return new Date(year, month, day);
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatDisplayDate(value) {
    const parsed = parseFacilityDate(value);

    if (!parsed) return value || "No date entered";

    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const year = parsed.getFullYear();

    return `${month}-${day}-${year}`;
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
        value: "Missing Documents",
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
        value: "Incomplete Documents",
        style: styles.warningBadge,
        missingItems,
      };
    }

    return {
      label: "Documents Complete",
      value: "Documents Complete",
      style: styles.uploadedBadge,
      missingItems: [],
    };
  }

  function documentStatusMatchesFilter(submission) {
    if (selectedDocumentStatus === "All Document Statuses") return true;

    const documents = getRelevantDocumentsForSubmission(submission.id);
    const status = getDocumentStatus(documents);

    if (selectedDocumentStatus === "Missing Documents") {
      return status.value === "Missing Documents";
    }

    if (selectedDocumentStatus === "Missing Cover Letter") {
      return status.missingItems.includes("Cover Letter");
    }

    if (selectedDocumentStatus === "Missing CMS-2567 / Survey Document") {
      return status.missingItems.includes("CMS-2567 / Survey Document");
    }

    if (selectedDocumentStatus === "Incomplete Documents") {
      return (
        status.value === "Incomplete Documents" ||
        status.value === "Missing Documents"
      );
    }

    if (selectedDocumentStatus === "Documents Complete") {
      return status.value === "Documents Complete";
    }

    return true;
  }

  async function viewFindings({
    fileId,
    key,
    submissionId,
    facility,
    surveyType,
  }) {
    setLoadingDoc(key);

    try {
      const res = await fetch("/api/parse-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          submissionId,
          facility,
          surveyType,
        }),
      });

      const data = await res.json();

      setParsedDocs((prev) => ({
        ...prev,
        [key]: data,
      }));

      await loadSavedAnalysis();
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

  const documentStatusOptions = [
    "All Document Statuses",
    "Incomplete Documents",
    "Missing Documents",
    "Missing Cover Letter",
    "Missing CMS-2567 / Survey Document",
    "Documents Complete",
  ];

  const filteredSubmissions = submissions.filter((submission) => {
    const facilityMatches =
      selectedFacility === "All Facilities" ||
      submission.answers?.["3"]?.answer === selectedFacility;

    const yearMatches =
      selectedYear === "All Years" ||
      getYearFromSubmission(submission) === selectedYear;

    const documentMatches = documentStatusMatchesFilter(submission);

    return facilityMatches && yearMatches && documentMatches;
  });

  function getParsedFindingsForSubmission(submissionId) {
    return Object.entries(parsedDocs)
      .filter(([key]) => key.startsWith(`${submissionId}-`))
      .map(([, value]) => value)
      .filter((parsed) => parsed && parsed.success !== false);
  }

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

  const severitySummaryItems = severityOrder
    .filter((severity) => severitySummary[severity])
    .map((severity) => ({
      severity,
      count: severitySummary[severity],
    }));

  const surveyTypeBreakdown = filteredSubmissions.reduce((summary, submission) => {
    const surveyType = getAnswer(submission.answers, "4") || "Unknown";
    summary[surveyType] = (summary[surveyType] || 0) + 1;
    return summary;
  }, {});

  const surveyTypeBreakdownItems = Object.entries(surveyTypeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
    }));

  const weeklySummaryItems = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return submissions
      .filter((submission) => {
        const facilityMatches =
          selectedFacility === "All Facilities" ||
          submission.answers?.["3"]?.answer === selectedFacility;

        if (!facilityMatches) return false;

        const surveyDateValue = getAnswer(submission.answers, "5");
        const surveyDate = parseFacilityDate(surveyDateValue);

        if (!surveyDate) return false;

        return surveyDate >= sevenDaysAgo && surveyDate <= today;
      })
      .sort((a, b) => {
        const dateA = parseFacilityDate(getAnswer(a.answers, "5"));
        const dateB = parseFacilityDate(getAnswer(b.answers, "5"));

        return dateB - dateA;
      })
      .map((submission) => {
        const answers = submission.answers;

        return {
          id: submission.id,
          facility: getAnswer(answers, "3"),
          date: formatDisplayDate(getAnswer(answers, "5")),
          surveyType: getAnswer(answers, "4"),
          comments: getComments(answers),
        };
      });
  }, [submissions, selectedFacility]);

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

          <div>
            <label style={styles.label}>Document Status</label>
            <select
              value={selectedDocumentStatus}
              onChange={(e) => setSelectedDocumentStatus(e.target.value)}
              style={styles.select}
            >
              {documentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.tileGrid}>
          <div style={styles.eventTile}>
            <p style={styles.eventTileLabel}>Survey Events</p>
            <h2 style={styles.eventTileNumber}>{filteredSubmissions.length}</h2>

            <div style={styles.breakdownList}>
              {surveyTypeBreakdownItems.length > 0 ? (
                surveyTypeBreakdownItems.map((item) => (
                  <div key={item.type} style={styles.breakdownItem}>
                    <span>{item.type}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))
              ) : (
                <div style={styles.breakdownItem}>
                  <span>No survey activity</span>
                </div>
              )}
            </div>
          </div>

          <div style={styles.severityTile}>
            <p style={styles.eventTileLabel}>Severity Summary</p>

            <div style={styles.severityList}>
              {severitySummaryItems.length > 0 ? (
                severitySummaryItems.map((item) => (
                  <div key={item.severity} style={styles.severityItem}>
                    <span>{item.severity}</span>
                    <strong>
                      {item.count} {item.count === 1 ? "tag" : "tags"}
                    </strong>
                  </div>
                ))
              ) : (
                <div style={styles.severityEmpty}>
                  No findings reviewed yet
                </div>
              )}
            </div>

            <p style={styles.savedAnalysisNote}>
              Saved analyses: {savedAnalysisCount}
            </p>
          </div>

          <div style={styles.weeklyTile}>
            <p style={styles.eventTileLabel}>Weekly Summary</p>
            <p style={styles.weeklySubtext}>Past 7 days from today</p>

            <div style={styles.weeklyList}>
              {weeklySummaryItems.length > 0 ? (
                weeklySummaryItems.map((item) => (
                  <div key={item.id} style={styles.weeklyItem}>
                    <strong>{item.facility}</strong>: {item.date} -{" "}
                    {item.surveyType}.{" "}
                    <span style={styles.weeklyComments}>
                      Comments: {item.comments}
                    </span>
                  </div>
                ))
              ) : (
                <div style={styles.weeklyEmpty}>
                  No survey activity entered in the past 7 days.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {filteredSubmissions.map((submission) => {
        const answers = submission.answers;
        const documents = getRelevantDocumentsForSubmission(submission.id);
        const documentStatus = getDocumentStatus(documents);
        const comments = getComments(answers);
        const facility = getAnswer(answers, "3");
        const surveyType = getAnswer(answers, "4");

        return (
          <section key={submission.id} style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <h2 style={styles.facilityName}>{facility}</h2>
                <p style={styles.meta}>
                  {surveyType} • Intake #{getAnswer(answers, "6")}
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
                          <div>
                            <p style={styles.documentName}>{documentName}</p>
                            {parsed?.loadedFromSavedAnalysis && (
                              <p style={styles.savedBadgeText}>
                                Saved findings loaded
                              </p>
                            )}
                          </div>
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
                            onClick={() =>
                              viewFindings({
                                fileId: file.fileId,
                                key,
                                submissionId: submission.id,
                                facility,
                                surveyType,
                              })
                            }
                            style={styles.parseButton}
                          >
                            {loadingDoc === key
                              ? "Reviewing..."
                              : parsed
                              ? "Refresh Findings"
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
    padding: "24px",
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
    padding: "26px 30px",
    borderRadius: "24px",
    marginBottom: "16px",
    boxShadow: "0 16px 38px rgba(15, 42, 74, 0.20)",
    border: "1px solid rgba(255,255,255,0.16)",
  },

  title: {
    fontSize: "42px",
    lineHeight: 1,
    letterSpacing: "-1.2px",
    margin: 0,
    fontWeight: "800",
  },

  controlPanel: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
    marginBottom: "16px",
  },

  filterGrid: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    background: "rgba(255,255,255,0.86)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    padding: "14px",
    borderRadius: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  },

  label: {
    display: "block",
    fontWeight: "800",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    marginBottom: "6px",
  },

  select: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "white",
    fontSize: "14px",
    minWidth: "240px",
    outline: "none",
  },

  tileGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.75fr 2fr",
    gap: "12px",
    alignItems: "stretch",
  },

  eventTile: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: "16px",
    borderRadius: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  },

  severityTile: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: "16px",
    borderRadius: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  },

  weeklyTile: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: "16px",
    borderRadius: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  },

  eventTileLabel: {
    margin: 0,
    color: "#64748b",
    fontWeight: "800",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  eventTileNumber: {
    fontSize: "38px",
    margin: "4px 0 0",
    letterSpacing: "-1px",
  },

  savedAnalysisNote: {
    margin: "9px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  breakdownList: {
    marginTop: "9px",
    display: "grid",
    gap: "5px",
  },

  breakdownItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.25,
    fontWeight: "700",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "6px",
  },

  severityList: {
    marginTop: "9px",
    display: "grid",
    gap: "5px",
  },

  severityItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    color: "#1e293b",
    fontSize: "15px",
    fontWeight: "800",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "6px",
  },

  severityEmpty: {
    marginTop: "10px",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: 1.35,
  },

  weeklySubtext: {
    margin: "4px 0 0",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "700",
  },

  weeklyList: {
    marginTop: "10px",
    display: "grid",
    gap: "8px",
    maxHeight: "190px",
    overflowY: "auto",
    paddingRight: "4px",
  },

  weeklyItem: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "8px",
    color: "#334155",
    fontSize: "13px",
    lineHeight: 1.45,
  },

  weeklyComments: {
    color: "#64748b",
  },

  weeklyEmpty: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: 1.4,
    borderTop: "1px solid #e2e8f0",
    paddingTop: "8px",
  },

  card: {
    position: "relative",
    background: "rgba(255,255,255,0.93)",
    backdropFilter: "blur(12px)",
    padding: "18px",
    borderRadius: "24px",
    marginBottom: "16px",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.065)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "14px",
    alignItems: "flex-start",
  },

  facilityName: {
    margin: 0,
    fontSize: "25px",
    letterSpacing: "-0.35px",
  },

  meta: {
    color: "#64748b",
    marginTop: "4px",
    marginBottom: 0,
    fontSize: "14px",
  },

  submissionId: {
    color: "#94a3b8",
    fontSize: "12px",
    marginTop: "4px",
    marginBottom: 0,
  },

  uploadedBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "800",
    height: "fit-content",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },

  warningBadge: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "800",
    height: "fit-content",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },

  missingBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "800",
    height: "fit-content",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "1px",
    background: "#e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "14px",
    border: "1px solid #e2e8f0",
  },

  detailItem: {
    background: "#f8fafc",
    padding: "12px 14px",
    minHeight: "58px",
  },

  commentsItem: {
    gridColumn: "1 / -1",
    background: "#f8fafc",
    padding: "12px 14px",
  },

  detailLabel: {
    display: "block",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    fontWeight: "800",
    marginBottom: "5px",
  },

  detailValue: {
    margin: 0,
    fontSize: "14px",
    color: "#0f172a",
  },

  commentValue: {
    margin: 0,
    fontSize: "13px",
    color: "#334155",
    lineHeight: 1.4,
  },

  documentsSection: {
    background: "#f8fafc",
    padding: "14px",
    borderRadius: "18px",
    border: "1px solid #e2e8f0",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "19px",
  },

  noDocs: {
    color: "#64748b",
    lineHeight: 1.4,
    margin: 0,
    fontSize: "13px",
  },

  missingDocumentBox: {
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa",
    borderRadius: "13px",
    padding: "10px 12px",
    marginBottom: "10px",
    fontSize: "13px",
  },

  documentList: {
    display: "grid",
    gap: "10px",
  },

  documentBox: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "15px",
    padding: "12px",
  },

  documentHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "9px",
  },

  documentName: {
    margin: 0,
    fontWeight: "800",
    fontSize: "14px",
  },

  savedBadgeText: {
    margin: "3px 0 0",
    color: "#166534",
    fontSize: "11px",
    fontWeight: "800",
  },

  pdfBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "4px 8px",
    borderRadius: "999px",
    fontWeight: "800",
    height: "fit-content",
    fontSize: "10px",
  },

  buttonRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  documentLink: {
    display: "inline-block",
    background: "#2563eb",
    color: "white",
    padding: "8px 12px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: "800",
    fontSize: "13px",
  },

  parseButton: {
    background: "#111827",
    color: "white",
    padding: "8px 12px",
    borderRadius: "10px",
    border: "none",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "13px",
  },

  parseResult: {
    marginTop: "10px",
    padding: "10px 12px",
    background: "#eef4ff",
    borderRadius: "12px",
    border: "1px solid #dbeafe",
  },

  errorText: {
    color: "#991b1b",
  },

  findingLine: {
    margin: "0 0 7px",
    fontSize: "13px",
  },

  deficiencyList: {
    marginTop: "8px",
    marginBottom: "6px",
    fontSize: "13px",
  },

  pillWrap: {
    marginTop: "7px",
  },

  deficiencyPill: {
    display: "inline-block",
    marginRight: "6px",
    marginBottom: "6px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "800",
    fontSize: "12px",
  },
};
