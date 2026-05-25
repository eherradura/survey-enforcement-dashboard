"use client";

import { useEffect, useMemo, useState } from "react";
import WeeklySummaryByDivision from "../components/WeeklySummaryByDivision";

export default function Home() {
  const [dashboardView, setDashboardView] = useState("weekly");

  const [weeklyDateRange, setWeeklyDateRange] = useState(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    const formatInputDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatInputDate(start),
      end: formatInputDate(today),
    };
  });

  const [submissions, setSubmissions] = useState([]);
  const [driveData, setDriveData] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("All Facilities");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedSurveyTypes, setSelectedSurveyTypes] = useState([]);
  const [parsedDocs, setParsedDocs] = useState({});
  const [loadingDoc, setLoadingDoc] = useState(null);
  const [savedAnalysisCount, setSavedAnalysisCount] = useState(0);

  useEffect(() => {
    document.title = "Survey Dashboard";

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
            noDeficiencyLetter:
              record.noDeficiencyLetter === true ||
              record.noDeficiencyLetter === "true",
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

  function isDateWithinSelectedRange(value, startValue, endValue) {
    const parsed = parseFacilityDate(value);

    if (!parsed) return false;

    const start = startValue ? new Date(`${startValue}T00:00:00`) : null;
    const end = endValue ? new Date(`${endValue}T23:59:59`) : null;

    if (start && parsed < start) return false;
    if (end && parsed > end) return false;

    return true;
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

  function isPdfFile(file) {
    const name = String(file?.name || "").toLowerCase();
    const mimeType = String(file?.mimeType || file?.type || "").toLowerCase();

    return (
      name.endsWith(".pdf") ||
      mimeType.includes("pdf") ||
      mimeType.includes("application/pdf")
    );
  }

  function isJotformSubmissionPdf(file, submissionId) {
    const name = String(file?.name || "").trim().toLowerCase();
    const cleanSubmissionId = String(submissionId || "").trim().toLowerCase();

    if (!name || !cleanSubmissionId) return false;

    if (name === `${cleanSubmissionId}.pdf`) return true;
    if (/^\d+\.pdf$/i.test(name)) return true;

    return false;
  }

  function getRelevantDocumentsForSubmission(submissionId) {
    const allDocuments = getAllDocumentsForSubmission(submissionId);
    const seen = new Set();

    return allDocuments.filter((file) => {
      if (!file) return false;
      if (!isPdfFile(file)) return false;
      if (isJotformSubmissionPdf(file, submissionId)) return false;

      const normalizedName = String(file.name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

      if (seen.has(normalizedName)) return false;

      seen.add(normalizedName);
      return true;
    });
  }

  function getSurveyTypeCardStyle(surveyType) {
    const type = String(surveyType || "").toLowerCase();

    if (type.includes("complaint")) {
      return {
        background:
          "linear-gradient(90deg, rgba(255, 251, 235, 0.98), rgba(255,255,255,0.96))",
        borderLeft: "7px solid #f59e0b",
      };
    }

    if (
      type.includes("facility reported") ||
      type.includes("fri") ||
      type.includes("reported incident") ||
      type.includes("facility-reported")
    ) {
      return {
        background:
          "linear-gradient(90deg, rgba(255, 241, 242, 0.98), rgba(255,255,255,0.96))",
        borderLeft: "7px solid #e11d48",
      };
    }

    if (type.includes("annual") || type.includes("recert")) {
      return {
        background:
          "linear-gradient(90deg, rgba(239, 246, 255, 0.98), rgba(255,255,255,0.96))",
        borderLeft: "7px solid #2563eb",
      };
    }

    if (
      type.includes("revisit") ||
      type.includes("follow") ||
      type.includes("validation")
    ) {
      return {
        background:
          "linear-gradient(90deg, rgba(240, 253, 244, 0.98), rgba(255,255,255,0.96))",
        borderLeft: "7px solid #16a34a",
      };
    }

    return {
      background: "rgba(255,255,255,0.94)",
      borderLeft: "7px solid #cbd5e1",
    };
  }

  function getSurveyTypeBadgeStyle(surveyType) {
    const type = String(surveyType || "").toLowerCase();

    if (type.includes("complaint")) {
      return {
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      };
    }

    if (
      type.includes("facility reported") ||
      type.includes("fri") ||
      type.includes("reported incident") ||
      type.includes("facility-reported")
    ) {
      return {
        background: "#ffe4e6",
        color: "#9f1239",
        border: "1px solid #fda4af",
      };
    }

    if (type.includes("annual") || type.includes("recert")) {
      return {
        background: "#dbeafe",
        color: "#1e40af",
        border: "1px solid #93c5fd",
      };
    }

    if (
      type.includes("revisit") ||
      type.includes("follow") ||
      type.includes("validation")
    ) {
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    }

    return {
      background: "#f1f5f9",
      color: "#334155",
      border: "1px solid #cbd5e1",
    };
  }

  function getParsedFindingsForSubmission(submissionId) {
    return Object.entries(parsedDocs)
      .filter(([key]) => key.startsWith(`${submissionId}-`))
      .map(([, value]) => value)
      .filter((parsed) => parsed && parsed.success !== false);
  }

  function getBestParsedAnalysisForSubmission(submissionId) {
    const parsedFindings = getParsedFindingsForSubmission(submissionId);

    if (parsedFindings.length === 0) return null;

    const noDeficiency = parsedFindings.find(
      (parsed) => parsed.noDeficiencyLetter === true
    );

    if (noDeficiency) return noDeficiency;

    const withDeficiencies = parsedFindings.find(
      (parsed) =>
        Array.isArray(parsed.deficiencies) && parsed.deficiencies.length > 0
    );

    if (withDeficiencies) return withDeficiencies;

    const withRemedyDates = parsedFindings.find(
      (parsed) => parsed.dpnaDateFromPdf || parsed.terminationDateFromPdf
    );

    if (withRemedyDates) return withRemedyDates;

    return parsedFindings[0];
  }

  function getDisplayDpnaDate(submission) {
    const parsed = getBestParsedAnalysisForSubmission(submission.id);

    if (parsed?.noDeficiencyLetter) return "Not applicable";

    const parsedDate = parsed?.dpnaDateFromPdf;
    if (parsedDate) return parsedDate;

    const jotformDate = getAnswer(submission.answers, "68");
    if (jotformDate && jotformDate !== "No information available") {
      return jotformDate;
    }

    return "No information available";
  }

  function getDisplayTerminationDate(submission) {
    const parsed = getBestParsedAnalysisForSubmission(submission.id);

    if (parsed?.noDeficiencyLetter) return "Not applicable";

    const parsedDate = parsed?.terminationDateFromPdf;
    if (parsedDate) return parsedDate;

    const jotformDate = getAnswer(submission.answers, "69");
    if (jotformDate && jotformDate !== "No information available") {
      return jotformDate;
    }

    return "No information available";
  }

  function getApprovedCompletionDateDisplay(submission) {
    const parsed = getBestParsedAnalysisForSubmission(submission.id);

    if (parsed?.noDeficiencyLetter) return "Not applicable";

    return "Pending information source";
  }

  function getEnforcementCycleDisplay(submission) {
    const parsed = getBestParsedAnalysisForSubmission(submission.id);

    if (parsed?.noDeficiencyLetter) return "None open";

    return "Needs review";
  }

  function toggleSurveyType(type) {
    setSelectedSurveyTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((item) => item !== type);
      }

      return [...prev, type];
    });
  }

  function clearSurveyTypeFilter() {
    setSelectedSurveyTypes([]);
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

  const surveyTypes = useMemo(() => {
    const types = submissions
      .map((submission) => getAnswer(submission.answers, "4"))
      .filter((type) => type && type !== "No information available");

    return Array.from(new Set(types)).sort();
  }, [submissions]);

  const filteredSubmissions = submissions.filter((submission) => {
    const surveyType = getAnswer(submission.answers, "4");

    const facilityMatches =
      selectedFacility === "All Facilities" ||
      submission.answers?.["3"]?.answer === selectedFacility;

    const yearMatches =
      selectedYear === "All Years" ||
      getYearFromSubmission(submission) === selectedYear;

    const surveyTypeMatches =
      selectedSurveyTypes.length === 0 ||
      selectedSurveyTypes.includes(surveyType);

    return facilityMatches && yearMatches && surveyTypeMatches;
  });

  const severitySummary = filteredSubmissions.reduce((summary, submission) => {
    const parsedFindings = getParsedFindingsForSubmission(submission.id);

    parsedFindings.forEach((parsed) => {
      if (parsed.noDeficiencyLetter) return;

      (parsed.deficiencies || []).forEach((deficiency) => {
        const severity = deficiency.scopeSeverity || "Unknown";
        summary[severity] = (summary[severity] || 0) + 1;
      });

      if (
        (!parsed.deficiencies || parsed.deficiencies.length === 0) &&
        parsed.coverLetterHighestSeverity
      ) {
        const severity = parsed.coverLetterHighestSeverity;
        summary[severity] = (summary[severity] || 0) + 1;
      }
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
    return submissions
      .map((submission) => {
        const answers = submission.answers;
        const facility = getAnswer(answers, "3");
        const rawDate = getAnswer(answers, "5");
        const surveyType = getAnswer(answers, "4");

        return {
          id: submission.id,
          facility,
          rawDate,
          date: formatDisplayDate(rawDate),
          surveyType,
          comments: getComments(answers),
        };
      })
      .filter((item) => {
        const withinSelectedDateRange = isDateWithinSelectedRange(
          item.rawDate,
          weeklyDateRange.start,
          weeklyDateRange.end
        );

        const facilityMatches =
          selectedFacility === "All Facilities" ||
          item.facility === selectedFacility;

        const surveyTypeMatches =
          selectedSurveyTypes.length === 0 ||
          selectedSurveyTypes.includes(item.surveyType);

        return withinSelectedDateRange && facilityMatches && surveyTypeMatches;
      })
      .sort((a, b) => {
        const dateA = parseFacilityDate(a.rawDate);
        const dateB = parseFacilityDate(b.rawDate);

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return dateB - dateA;
      });
  }, [submissions, selectedFacility, selectedSurveyTypes, weeklyDateRange]);

  return (
    <main style={styles.page}>
      <div style={styles.backgroundAccentOne}></div>
      <div style={styles.backgroundAccentTwo}></div>
      <div style={styles.backgroundGrid}></div>

      <section style={styles.header}>
        <h1 style={styles.title}>Survey Dashboard</h1>
      </section>

      <section style={styles.weeklySummaryUnderBanner}>
        <WeeklySummaryByDivision
          weeklySummaryItems={weeklySummaryItems}
          submissions={submissions}
          parsedDocs={parsedDocs}
          getAnswer={getAnswer}
          dashboardView={dashboardView}
          onDashboardViewChange={setDashboardView}
          weeklyDateRange={weeklyDateRange}
          onWeeklyDateRangeChange={setWeeklyDateRange}
        />
      </section>

      {dashboardView === "weekly" && (
        <>
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

              <div style={styles.surveyTypeFilterBox}>
                <div style={styles.surveyTypeHeader}>
                  <label style={styles.label}>Survey Type</label>

                  {selectedSurveyTypes.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSurveyTypeFilter}
                      style={styles.clearButton}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div style={styles.checkboxWrap}>
                  {surveyTypes.length > 0 ? (
                    surveyTypes.map((type) => (
                      <label key={type} style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={selectedSurveyTypes.includes(type)}
                          onChange={() => toggleSurveyType(type)}
                          style={styles.checkboxInput}
                        />
                        <span>{type}</span>
                      </label>
                    ))
                  ) : (
                    <span style={styles.noSurveyTypes}>
                      No survey types found
                    </span>
                  )}
                </div>

                <p style={styles.filterHint}>
                  {selectedSurveyTypes.length === 0
                    ? "Showing all survey types"
                    : `Showing ${selectedSurveyTypes.length} selected survey type${
                        selectedSurveyTypes.length === 1 ? "" : "s"
                      }`}
                </p>
              </div>
            </div>

            <div style={styles.tileGrid}>
              <div style={styles.eventTile}>
                <p style={styles.eventTileLabel}>Survey Events</p>
                <h2 style={styles.eventTileNumber}>
                  {filteredSubmissions.length}
                </h2>

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
            </div>
          </section>

          {filteredSubmissions.map((submission) => {
            const answers = submission.answers;
            const documents = getRelevantDocumentsForSubmission(submission.id);
            const comments = getComments(answers);
            const facility = getAnswer(answers, "3");
            const surveyType = getAnswer(answers, "4");

            return (
              <section
                key={submission.id}
                style={{
                  ...styles.card,
                  ...getSurveyTypeCardStyle(surveyType),
                }}
              >
                <div style={styles.cardTop}>
                  <div>
                    <h2 style={styles.facilityName}>{facility}</h2>

                    <div
                      style={{
                        ...styles.surveyTypeBadge,
                        ...getSurveyTypeBadgeStyle(surveyType),
                      }}
                    >
                      {surveyType}
                    </div>

                    <p style={styles.meta}>Intake #{getAnswer(answers, "6")}</p>
                    <p style={styles.submissionId}>
                      Submission ID: {submission.id}
                    </p>
                  </div>
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
                    <p style={styles.detailValue}>
                      {getDisplayDpnaDate(submission)}
                    </p>
                  </div>

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Termination Date</span>
                    <p style={styles.detailValue}>
                      {getDisplayTerminationDate(submission)}
                    </p>
                  </div>

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>
                      Approved Completion Date
                    </span>
                    <p style={styles.pendingValue}>
                      {getApprovedCompletionDateDisplay(submission)}
                    </p>
                  </div>

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Enforcement Cycle</span>
                    <p style={styles.reviewValue}>
                      {getEnforcementCycleDisplay(submission)}
                    </p>
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

                  {documents.length === 0 ? (
                    <p style={styles.noDocs}>
                      No PDF documents are currently matched to this survey
                      event.
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
                                href={`/api/file-view?fileId=${encodeURIComponent(
                                  file.fileId
                                )}&fileName=${encodeURIComponent(documentName)}`}
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

                                {parsed.dpnaDateFromPdf && (
                                  <p style={styles.findingLine}>
                                    <strong>DPNA Date From PDF:</strong>{" "}
                                    {parsed.dpnaDateFromPdf}
                                  </p>
                                )}

                                {parsed.terminationDateFromPdf && (
                                  <p style={styles.findingLine}>
                                    <strong>Termination Date From PDF:</strong>{" "}
                                    {parsed.terminationDateFromPdf}
                                  </p>
                                )}

                                {parsed.noDeficiencyLetter ? (
                                  <p style={styles.findingLine}>
                                    <strong>Deficiency:</strong> No deficiency
                                  </p>
                                ) : parsed.deficiencies?.length > 0 ? (
                                  <div style={styles.deficiencyList}>
                                    <strong>Deficiency Detail:</strong>
                                    <div style={styles.pillWrap}>
                                      {parsed.deficiencies.map(
                                        (def, defIndex) => (
                                          <div
                                            key={defIndex}
                                            style={styles.deficiencyPill}
                                          >
                                            {def.ftag}
                                            {def.scopeSeverity
                                              ? ` - ${def.scopeSeverity}`
                                              : " - Scope/Severity not found"}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                ) : parsed.coverLetterIndicatesDeficiencies ? (
                                  <p style={styles.findingLine}>
                                    <strong>Deficiency:</strong> Deficiencies
                                    indicated by cover letter. Individual F-tags
                                    were not extracted from the document text.
                                  </p>
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
        </>
      )}
    </main>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background: "#f4f7fb",
    padding: "18px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#0f172a",
  },

  backgroundAccentOne: {
    position: "fixed",
    width: "420px",
    height: "420px",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.08)",
    top: "-200px",
    right: "-160px",
    filter: "blur(10px)",
    pointerEvents: "none",
  },

  backgroundAccentTwo: {
    position: "fixed",
    width: "380px",
    height: "380px",
    borderRadius: "999px",
    background: "rgba(14, 165, 233, 0.06)",
    bottom: "-200px",
    left: "-160px",
    filter: "blur(12px)",
    pointerEvents: "none",
  },

  backgroundGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(15, 23, 42, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.025) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
    maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent 70%)",
    pointerEvents: "none",
  },

  header: {
    position: "relative",
    background:
      "linear-gradient(135deg, rgba(15, 42, 74, 0.98), rgba(30, 64, 115, 0.95))",
    color: "white",
    padding: "20px 24px",
    borderRadius: "20px",
    marginBottom: "12px",
    boxShadow: "0 12px 28px rgba(15, 42, 74, 0.18)",
    border: "1px solid rgba(255,255,255,0.16)",
  },

  title: {
    fontSize: "34px",
    lineHeight: 1,
    letterSpacing: "-0.8px",
    margin: 0,
    fontWeight: "800",
  },

  weeklySummaryUnderBanner: {
    position: "relative",
    marginBottom: "12px",
  },

  controlPanel: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    marginBottom: "12px",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(220px, 0.7fr) minmax(170px, 0.45fr) minmax(320px, 1.4fr)",
    gap: "10px",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    padding: "10px",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.055)",
  },

  label: {
    display: "block",
    fontWeight: "800",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    marginBottom: "4px",
  },

  select: {
    padding: "8px 10px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: "white",
    fontSize: "13px",
    width: "100%",
    outline: "none",
  },

  surveyTypeFilterBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "8px",
  },

  surveyTypeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },

  checkboxWrap: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    marginTop: "4px",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "white",
    border: "1px solid #cbd5e1",
    borderRadius: "999px",
    padding: "5px 8px",
    fontSize: "11px",
    fontWeight: "800",
    color: "#334155",
    cursor: "pointer",
  },

  checkboxInput: {
    width: "13px",
    height: "13px",
    cursor: "pointer",
  },

  clearButton: {
    background: "#e2e8f0",
    color: "#334155",
    border: "none",
    borderRadius: "999px",
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  filterHint: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
  },

  noSurveyTypes: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
  },

  tileGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.68fr",
    gap: "10px",
    alignItems: "stretch",
  },

  eventTile: {
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: "12px",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.055)",
  },

  severityTile: {
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: "12px",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.055)",
  },

  eventTileLabel: {
    margin: 0,
    color: "#64748b",
    fontWeight: "800",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  eventTileNumber: {
    fontSize: "32px",
    margin: "2px 0 0",
    letterSpacing: "-0.8px",
  },

  savedAnalysisNote: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
  },

  breakdownList: {
    marginTop: "7px",
    display: "grid",
    gap: "4px",
  },

  breakdownItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.2,
    fontWeight: "700",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "5px",
  },

  severityList: {
    marginTop: "7px",
    display: "grid",
    gap: "4px",
  },

  severityItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    color: "#1e293b",
    fontSize: "13px",
    fontWeight: "800",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "5px",
  },

  severityEmpty: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: 1.3,
  },

  card: {
    position: "relative",
    backdropFilter: "blur(12px)",
    padding: "13px",
    borderRadius: "18px",
    marginBottom: "10px",
    boxShadow: "0 8px 22px rgba(15, 23, 42, 0.055)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    overflow: "hidden",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
    alignItems: "flex-start",
  },

  facilityName: {
    margin: 0,
    fontSize: "21px",
    letterSpacing: "-0.25px",
  },

  surveyTypeBadge: {
    display: "inline-block",
    marginTop: "6px",
    marginBottom: "2px",
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  meta: {
    color: "#64748b",
    marginTop: "3px",
    marginBottom: 0,
    fontSize: "13px",
  },

  submissionId: {
    color: "#94a3b8",
    fontSize: "11px",
    marginTop: "3px",
    marginBottom: 0,
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "1px",
    background: "#e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "10px",
    border: "1px solid #e2e8f0",
  },

  detailItem: {
    background: "rgba(248,250,252,0.9)",
    padding: "8px 10px",
    minHeight: "48px",
  },

  commentsItem: {
    gridColumn: "1 / -1",
    background: "rgba(248,250,252,0.9)",
    padding: "8px 10px",
  },

  detailLabel: {
    display: "block",
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#64748b",
    fontWeight: "800",
    marginBottom: "4px",
  },

  detailValue: {
    margin: 0,
    fontSize: "13px",
    color: "#0f172a",
  },

  pendingValue: {
    margin: 0,
    fontSize: "13px",
    color: "#92400e",
    fontWeight: "800",
  },

  reviewValue: {
    margin: 0,
    fontSize: "13px",
    color: "#1e40af",
    fontWeight: "800",
  },

  commentValue: {
    margin: 0,
    fontSize: "12px",
    color: "#334155",
    lineHeight: 1.3,
  },

  documentsSection: {
    background: "rgba(248,250,252,0.9)",
    padding: "10px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "6px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "17px",
  },

  noDocs: {
    color: "#64748b",
    lineHeight: 1.35,
    margin: 0,
    fontSize: "12px",
  },

  documentList: {
    display: "grid",
    gap: "8px",
  },

  documentBox: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "9px",
  },

  documentHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "7px",
  },

  documentName: {
    margin: 0,
    fontWeight: "800",
    fontSize: "13px",
  },

  savedBadgeText: {
    margin: "2px 0 0",
    color: "#166534",
    fontSize: "10px",
    fontWeight: "800",
  },

  pdfBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "3px 7px",
    borderRadius: "999px",
    fontWeight: "800",
    height: "fit-content",
    fontSize: "9px",
  },

  buttonRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },

  documentLink: {
    display: "inline-block",
    background: "#2563eb",
    color: "white",
    padding: "7px 10px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "800",
    fontSize: "12px",
  },

  parseButton: {
    background: "#111827",
    color: "white",
    padding: "7px 10px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "12px",
  },

  parseResult: {
    marginTop: "8px",
    padding: "8px 10px",
    background: "#eef4ff",
    borderRadius: "10px",
    border: "1px solid #dbeafe",
  },

  errorText: {
    color: "#991b1b",
  },

  findingLine: {
    margin: "0 0 6px",
    fontSize: "12px",
  },

  deficiencyList: {
    marginTop: "7px",
    marginBottom: "5px",
    fontSize: "12px",
  },

  pillWrap: {
    marginTop: "6px",
  },

  deficiencyPill: {
    display: "inline-block",
    marginRight: "5px",
    marginBottom: "5px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "5px 8px",
    borderRadius: "999px",
    fontWeight: "800",
    fontSize: "11px",
  },
};
