"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

const CURRENT_YEAR = new Date().getFullYear();

const DIVISIONS = {
  "Erick Herradura's Division": [
    "Erick Herradura",
    "Beth Clark",
    "Jinkee Javier",
    "Guillermo Vicencio",
    "Brenda Rojas",
  ],
  "Donna Kimura's Division": [
    "Donna Kimura",
    "Gerly Orona",
    "Melissa Acuna",
    "Sammy Balisbis",
  ],
};

const DIVISION_STYLES = {
  "Erick Herradura's Division": {
    shellBackground: "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(255,255,255,0.98))",
    border: "1px solid #bfdbfe",
    accent: "#2563eb",
    softAccent: "#dbeafe",
    text: "#1e3a8a",
    cardBackground: "#ffffff",
    badgeBackground: "#dbeafe",
    badgeText: "#1e40af",
  },
  "Donna Kimura's Division": {
    shellBackground: "linear-gradient(135deg, rgba(240,253,244,0.98), rgba(255,255,255,0.98))",
    border: "1px solid #bbf7d0",
    accent: "#16a34a",
    softAccent: "#dcfce7",
    text: "#166534",
    cardBackground: "#ffffff",
    badgeBackground: "#dcfce7",
    badgeText: "#166534",
  },
  Unassigned: {
    shellBackground: "linear-gradient(135deg, rgba(248,250,252,0.98), rgba(255,255,255,0.98))",
    border: "1px solid #cbd5e1",
    accent: "#64748b",
    softAccent: "#f1f5f9",
    text: "#334155",
    cardBackground: "#ffffff",
    badgeBackground: "#f1f5f9",
    badgeText: "#334155",
  },
};

const CONSULTANT_PHOTOS = {
  "Erick Herradura": "/consultants/Erick Herradura.jpg",
  "Donna Kimura": "/consultants/Donna Kimura.jpg",
  "Beth Clark": "/consultants/Beth Clark.jpg",
  "Brenda Rojas": "/consultants/Brenda Washington.jpg",
  "Gerly Orona": "/consultants/Gerly Orona.jpg",
  "Guillermo Vicencio": "/consultants/Guillermo Vicencio.jpg",
  "Jinkee Javier": "/consultants/Jinkee Javier.jpg",
  "Melissa Acuna": "/consultants/Melissa Acuna.jpg",
  "Sammy Balisbis": "/consultants/Sammy Balisbis.jpg",
};

const FACILITY_CONSULTANT_MAP = {
  // paste your full FACILITY_CONSULTANT_MAP here from your original file
  // (I omitted it for brevity - copy it from your backup)
};

const DEFICIENCY_POINTS = {
  A: 0,
  B: 0,
  C: 0,
  D: 4,
  E: 8,
  F: 16,
  G: 20,
  H: 35,
  I: 45,
  J: 50,
  K: 100,
  L: 150,
};

function normalizeFacilityName(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePersonName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function consultantExists(name) {
  const normalizedName = normalizePersonName(name);
  return Object.values(DIVISIONS).some((consultants) =>
    consultants.includes(normalizedName)
  );
}

function getConsultantForFacility(facilityName) {
  const normalized = normalizeFacilityName(facilityName);
  if (FACILITY_CONSULTANT_MAP[normalized]) {
    return FACILITY_CONSULTANT_MAP[normalized];
  }
  const partialMatch = Object.entries(FACILITY_CONSULTANT_MAP).find(
    ([facility]) =>
      normalized.includes(facility) || facility.includes(normalized)
  );
  if (partialMatch) {
    return partialMatch[1];
  }
  return "Unassigned";
}

function getConsultantForSignificantEvent(event) {
  const rnc = normalizePersonName(event.rnc);
  if (rnc && consultantExists(rnc)) {
    return rnc;
  }
  return getConsultantForFacility(event.facility);
}

function getDivisionForConsultant(consultantName) {
  for (const [division, consultants] of Object.entries(DIVISIONS)) {
    if (consultants.includes(consultantName)) {
      return division;
    }
  }
  return "Unassigned";
}

function getDivisionStyle(divisionName) {
  return DIVISION_STYLES[divisionName] || DIVISION_STYLES.Unassigned;
}

function getSeverityPoints(scopeSeverity) {
  const severity = String(scopeSeverity || "").trim().toUpperCase();
  return DEFICIENCY_POINTS[severity] ?? 0;
}

function getYearFromDateValue(value) {
  if (!value) return null;
  const text = String(value);
  const directYear = text.match(/\b(20\d{2})\b/);
  if (directYear) return Number(directYear[1]);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getFullYear();
  }
  return null;
}

function getParsedFindingsForSubmission(parsedDocs, submissionId) {
  return Object.entries(parsedDocs || {})
    .filter(([key]) => key.startsWith(`${submissionId}-`))
    .map(([, value]) => value)
    .filter((parsed) => parsed && parsed.success !== false);
}

function normalizeDeficiencyList(parsed) {
  if (!parsed || parsed.noDeficiencyLetter) return [];
  if (Array.isArray(parsed.deficiencies) && parsed.deficiencies.length > 0) {
    return parsed.deficiencies
      .map((deficiency) => ({
        ftag: deficiency.ftag || deficiency.tag || deficiency.fTag || deficiency.FTag || null,
        scopeSeverity: deficiency.scopeSeverity || deficiency.severity || deficiency.scopeAndSeverity || deficiency.scope_severity || null,
      }))
      .filter((item) => item.ftag);
  }
  // ... rest of your normalizeDeficiencyList function
}

function calculateSubmissionPoints(parsedFindings) {
  let totalPoints = 0;
  let deficiencyCount = 0;
  const countedDeficiencies = new Set();
  parsedFindings.forEach((parsed) => {
    const deficiencies = normalizeDeficiencyList(parsed);
    deficiencies.forEach((deficiency) => {
      const ftag = String(deficiency.ftag || "").trim().toUpperCase().replace(/\s+/g, "");
      const severity = String(deficiency.scopeSeverity || "").trim().toUpperCase();
      if (!ftag) return;
      const deficiencyKey = `${ftag}-${severity || "UNKNOWN"}`;
      if (countedDeficiencies.has(deficiencyKey)) return;
      countedDeficiencies.add(deficiencyKey);
      const points = getSeverityPoints(severity);
      totalPoints += points;
      deficiencyCount += 1;
    });
  });
  return {
    totalPoints,
    deficiencyCount,
  };
}

function ConsultantAvatar({ consultant, size = 48 }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photo = CONSULTANT_PHOTOS[consultant];
  if (!photo || imageFailed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#dbeafe",
          color: "#1e40af",
          fontWeight: "950",
          flexShrink: 0,
          fontSize: size <= 52 ? "14px" : "20px",
        }}
      >
        {String(consultant || "?")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={encodeURI(photo)}
      alt={consultant}
      style={{
        width: size,
        height: size,
        borderRadius: "14px",
        objectFit: "cover",
        border: "2px solid white",
        boxShadow: "0 5px 14px rgba(15,23,42,0.14)",
        flexShrink: 0,
        background: "#e2e8f0",
        display: "block",
      }}
      onError={() => setImageFailed(true)}
    />
  );
}

export default function WeeklySummaryByDivision({
  weeklySummaryItems = [],
  weeklySignificantEvents = [],
  submissions = [],
  parsedDocs = {},
  getAnswer,
  dashboardView = "weekly",
  onDashboardViewChange,
  weeklyDateRange = { start: "", end: "" },
  onWeeklyDateRangeChange,
}) {
  const weeklyEventCount = weeklySummaryItems.length;
  const significantEventCount = weeklySignificantEvents.length;
  const isStandingView = dashboardView === "standing";

  const groupedWeeklyItems = useMemo(() => {
    const groups = {};
    Object.entries(DIVISIONS).forEach(([division, consultants]) => {
      groups[division] = {};
      consultants.forEach((consultant) => {
        groups[division][consultant] = {
          surveyActivity: [],
          significantEvents: [],
        };
      });
    });
    weeklySummaryItems.forEach((item) => {
      const consultant = getConsultantForFacility(item.facility);
      const division = getDivisionForConsultant(consultant);
      if (!groups[division]) groups[division] = {};
      if (!groups[division][consultant]) {
        groups[division][consultant] = {
          surveyActivity: [],
          significantEvents: [],
        };
      }
      groups[division][consultant].surveyActivity.push(item);
    });
    weeklySignificantEvents.forEach((item) => {
      const consultant = getConsultantForSignificantEvent(item);
      const division = getDivisionForConsultant(consultant);
      if (!groups[division]) groups[division] = {};
      if (!groups[division][consultant]) {
        groups[division][consultant] = {
          surveyActivity: [],
          significantEvents: [],
        };
      }
      groups[division][consultant].significantEvents.push(item);
    });
    return groups;
  }, [weeklySummaryItems, weeklySignificantEvents]);

  // ... your facilityStanding useMemo remains unchanged

  return (
    <section style={styles.wrapper}>
      <div style={styles.headerRow}>
        <div style={styles.titleCluster}>
          <div style={styles.titleLine}>
            <p style={styles.kicker}>Weekly Summary</p>
            <span style={styles.eventBubble}>{weeklyEventCount}</span>
            <span style={styles.eventBubbleLabel}>
              {weeklyEventCount === 1 ? "survey event" : "survey events"}
            </span>

            <Link href="/missing-don-reports" style={{ textDecoration: "none" }}>
              <span style={styles.significantBubble}>{significantEventCount}</span>
            </Link>
            <span style={styles.significantBubbleLabel}>
              {significantEventCount === 1 ? "significant event" : "significant events"}
            </span>
          </div>

          {/* your date range controls unchanged */}
        </div>

        {/* your Facility Standing button unchanged */}
      </div>

      <div style={styles.weeklyContent}>
        {weeklyEventCount === 0 && significantEventCount === 0 && (
          <p style={styles.emptyText}>
            No survey activity or significant events for the selected date range.
          </p>
        )}

        {Object.entries(groupedWeeklyItems).map(([division, consultants]) => {
          const divisionStyle = getDivisionStyle(division);
          const divisionSurveyCount = Object.values(consultants).reduce(
            (total, item) => total + item.surveyActivity.length,
            0
          );
          const divisionSignificantCount = Object.values(consultants).reduce(
            (total, item) => total + item.significantEvents.length,
            0
          );

          return (
            <div
              key={division}
              style={{
                ...styles.divisionBlock,
                background: divisionStyle.shellBackground,
                border: divisionStyle.border,
                borderLeft: `6px solid ${divisionStyle.accent}`,
              }}
            >
              <div style={styles.divisionHeader}>
                <div>
                  <h3 style={{ ...styles.divisionTitle, color: divisionStyle.text }}>
                    {division}
                  </h3>
                  <p style={styles.divisionSubtext}>
                    Survey activity and significant events by assigned consultant
                  </p>
                </div>
                <div style={styles.divisionBadgeGroup}>
                  <span
                    style={{
                      ...styles.divisionBadge,
                      background: divisionStyle.badgeBackground,
                      color: divisionStyle.badgeText,
                    }}
                  >
                    {divisionSurveyCount} survey
                  </span>
                  <span
                    style={{
                      ...styles.divisionBadge,
                      background: "#fff7ed",
                      color: "#9a3412",
                    }}
                  >
                    {divisionSignificantCount} significant
                  </span>
                </div>
              </div>

              <div style={styles.consultantGrid}>
                {Object.entries(consultants).map(([consultant, data]) => {
                  const surveyItems = data.surveyActivity || [];
                  const significantItems = data.significantEvents || [];
                  return (
                    <div
                      key={consultant}
                      style={{
                        ...styles.consultantCard,
                        background: divisionStyle.cardBackground,
                      }}
                    >
                      <div style={styles.consultantHeader}>
                        <ConsultantAvatar consultant={consultant} size={52} />
                        <div style={styles.consultantTextBlock}>
                          <p style={styles.consultantName}>{consultant}</p>
                          <p style={styles.smallMuted}>
                            {surveyItems.length} survey ·{" "}
                            {significantItems.length} significant
                          </p>
                        </div>
                      </div>

                      <div style={styles.cardSection}>
                        <div style={styles.sectionMiniHeader}>
                          <span style={styles.sectionDotBlue}></span>
                          <h4 style={styles.sectionMiniTitle}>
                            Survey Activity
                          </h4>
                        </div>
                        {surveyItems.length === 0 ? (
                          <p style={styles.noConsultantEvents}>
                            No survey activity this period
                          </p>
                        ) : (
                          <div style={styles.eventList}>
                            {surveyItems.map((item) => (
                              <div key={item.id} style={styles.weeklyEvent}>
                                <div style={styles.eventTopLine}>
                                  <strong>{item.facility}</strong>
                                  <span>{item.date}</span>
                                </div>
                                <p style={styles.eventSurveyType}>
                                  {item.surveyType}
                                </p>
                                <em>
                                  {item.comments || "No comments entered"}
                                </em>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={styles.cardSection}>
                        <div style={styles.sectionMiniHeader}>
                          <span style={styles.sectionDotOrange}></span>
                          <h4 style={styles.sectionMiniTitle}>
                            Significant Events
                          </h4>
                        </div>
                        {significantItems.length === 0 ? (
                          <p style={styles.noSignificantEvents}>
                            No significant events this period
                          </p>
                        ) : (
                          <div style={styles.eventList}>
                            {significantItems.map((item) => (
                              <div
                                key={item.id}
                                style={styles.significantEvent}
                              >
                                <div style={styles.eventTopLine}>
                                  <strong>{item.facility}</strong>
                                  <span>{item.date}</span>
                                </div>
                                <p style={styles.significantComment}>
                                  {item.comment}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Styles object (paste your full styles here from the original file)
const styles = {
  // ... all your styles
};
