"use client";

import { useMemo, useState } from "react";

const CURRENT_YEAR = new Date().getFullYear();

const DIVISIONS = {
  "Erick's Division": ["Beth Clark", "Jinkee Javier", "Guillermo Vicencio", "Brenda Washington"],
  "Donna's Division": ["Gerly Orona", "Melissa Acuna", "Sammy Balisbis"],
};

const CONSULTANT_PHOTOS = {
  "Beth Clark": "/Beth Clark.jpg",
  "Brenda Washington": "/Brenda Washington.jpg",
  "Gerly Orona": "/Gerly Orona.jpg",
  "Guillermo Vicencio": "/Guillermo Vicencio.jpg",
  "Jinkee Javier": "/Jinkee Javier.jpg",
  "Melissa Acuna": "/Melissa Acuna.jpg",
  "Sammy Balisbis": "/Sammy Balisbis.jpg",
};

// Add or correct facility assignments here.
// Use uppercase facility names as keys.
const FACILITY_CONSULTANT_MAP = {
  "MISSION CARE CENTER": "Melissa Acuna",
  "MISSION CARMICHAEL": "Jinkee Javier",
};

// CMS health inspection deficiency point weights.
// This is regular scope/severity scoring, not SQOC/revisit-adjusted scoring.
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
    .replace(/\s+/g, " ");
}

function getConsultantForFacility(facilityName) {
  const normalized = normalizeFacilityName(facilityName);

  if (FACILITY_CONSULTANT_MAP[normalized]) {
    return FACILITY_CONSULTANT_MAP[normalized];
  }

  const partialMatch = Object.entries(FACILITY_CONSULTANT_MAP).find(([facility]) =>
    normalized.includes(facility)
  );

  if (partialMatch) {
    return partialMatch[1];
  }

  return "Unassigned";
}

function getDivisionForConsultant(consultantName) {
  for (const [division, consultants] of Object.entries(DIVISIONS)) {
    if (consultants.includes(consultantName)) {
      return division;
    }
  }

  return "Unassigned";
}

function getSeverityPoints(scopeSeverity) {
  const severity = String(scopeSeverity || "").trim().toUpperCase();
  return DEFICIENCY_POINTS[severity] ?? 0;
}

function formatDateForDisplay(value) {
  if (!value) return "No date entered";

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const year = parsed.getFullYear();

    return `${month}-${day}-${year}`;
  }

  return value;
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

function calculateSubmissionPoints(parsedFindings) {
  let totalPoints = 0;
  let deficiencyCount = 0;
  const tags = [];

  parsedFindings.forEach((parsed) => {
    if (parsed.noDeficiencyLetter) return;

    (parsed.deficiencies || []).forEach((deficiency) => {
      const severity = String(deficiency.scopeSeverity || "").trim().toUpperCase();
      const points = getSeverityPoints(severity);

      totalPoints += points;
      deficiencyCount += 1;

      tags.push({
        ftag: deficiency.ftag || "Unknown",
        severity: severity || "Unknown",
        points,
      });
    });
  });

  return {
    totalPoints,
    deficiencyCount,
    tags,
  };
}

export default function WeeklySummaryByDivision({
  weeklySummaryItems = [],
  submissions = [],
  parsedDocs = {},
  getAnswer,
}) {
  const [view, setView] = useState("weekly");

  const weeklyEventCount = weeklySummaryItems.length;

  const facilityStanding = useMemo(() => {
    const consultantMap = {};

    Object.entries(DIVISIONS).forEach(([division, consultants]) => {
      consultants.forEach((consultant) => {
        consultantMap[consultant] = {
          consultant,
          division,
          photo: CONSULTANT_PHOTOS[consultant],
          totalPoints: 0,
          deficiencyCount: 0,
          surveyCount: 0,
          facilities: new Map(),
          tags: [],
        };
      });
    });

    consultantMap.Unassigned = {
      consultant: "Unassigned",
      division: "Unassigned",
      photo: null,
      totalPoints: 0,
      deficiencyCount: 0,
      surveyCount: 0,
      facilities: new Map(),
      tags: [],
    };

    submissions.forEach((submission) => {
      const answers = submission.answers || {};
      const facility = getAnswer ? getAnswer(answers, "3") : answers?.["3"]?.answer;
      const surveyDate = getAnswer ? getAnswer(answers, "5") : answers?.["5"]?.answer;
      const surveyYear = getYearFromDateValue(surveyDate);

      if (surveyYear !== CURRENT_YEAR) return;

      const consultant = getConsultantForFacility(facility);
      const parsedFindings = getParsedFindingsForSubmission(parsedDocs, submission.id);
      const pointsSummary = calculateSubmissionPoints(parsedFindings);

      if (!consultantMap[consultant]) {
        consultantMap[consultant] = {
          consultant,
          division: getDivisionForConsultant(consultant),
          photo: CONSULTANT_PHOTOS[consultant] || null,
          totalPoints: 0,
          deficiencyCount: 0,
          surveyCount: 0,
          facilities: new Map(),
          tags: [],
        };
      }

      consultantMap[consultant].surveyCount += 1;
      consultantMap[consultant].totalPoints += pointsSummary.totalPoints;
      consultantMap[consultant].deficiencyCount += pointsSummary.deficiencyCount;

      const facilityKey = facility || "Unknown Facility";

      if (!consultantMap[consultant].facilities.has(facilityKey)) {
        consultantMap[consultant].facilities.set(facilityKey, {
          facility: facilityKey,
          points: 0,
          deficiencyCount: 0,
          surveyCount: 0,
        });
      }

      const facilityRecord = consultantMap[consultant].facilities.get(facilityKey);
      facilityRecord.points += pointsSummary.totalPoints;
      facilityRecord.deficiencyCount += pointsSummary.deficiencyCount;
      facilityRecord.surveyCount += 1;

      pointsSummary.tags.forEach((tag) => {
        consultantMap[consultant].tags.push({
          ...tag,
          facility: facilityKey,
          surveyDate: formatDateForDisplay(surveyDate),
        });
      });
    });

    const ranked = Object.values(consultantMap)
      .filter((item) => item.consultant !== "Unassigned" || item.surveyCount > 0)
      .map((item) => ({
        ...item,
        facilities: Array.from(item.facilities.values()).sort(
          (a, b) => b.points - a.points
        ),
      }))
      .sort((a, b) => {
        if (a.totalPoints !== b.totalPoints) return a.totalPoints - b.totalPoints;
        if (a.deficiencyCount !== b.deficiencyCount) {
          return a.deficiencyCount - b.deficiencyCount;
        }
        return a.consultant.localeCompare(b.consultant);
      });

    const maxPoints = Math.max(...ranked.map((item) => item.totalPoints), 1);

    return ranked.map((item, index) => ({
      ...item,
      rank: index + 1,
      barWidth: `${Math.max((item.totalPoints / maxPoints) * 100, item.totalPoints > 0 ? 8 : 2)}%`,
    }));
  }, [submissions, parsedDocs, getAnswer]);

  const groupedWeeklyItems = useMemo(() => {
    const groups = {};

    weeklySummaryItems.forEach((item) => {
      const consultant = getConsultantForFacility(item.facility);
      const division = getDivisionForConsultant(consultant);

      if (!groups[division]) {
        groups[division] = {};
      }

      if (!groups[division][consultant]) {
        groups[division][consultant] = [];
      }

      groups[division][consultant].push(item);
    });

    return groups;
  }, [weeklySummaryItems]);

  return (
    <section style={styles.wrapper}>
      <div style={styles.headerRow}>
        <div style={styles.titleCluster}>
          <div style={styles.titleLine}>
            <p style={styles.kicker}>Weekly Summary</p>
            <span style={styles.eventBubble}>{weeklyEventCount} events</span>
          </div>

          <h2 style={styles.title}>
            {view === "weekly"
              ? "Past 7 Days"
              : `Facility Standing for ${CURRENT_YEAR}`}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setView(view === "weekly" ? "standing" : "weekly")}
          style={styles.linkButton}
        >
          {view === "weekly" ? "Facility Standing" : "Back to Weekly Summary"}
        </button>
      </div>

      {view === "weekly" ? (
        <div style={styles.weeklyContent}>
          {weeklyEventCount === 0 ? (
            <p style={styles.emptyText}>No survey activity in the past 7 days.</p>
          ) : (
            Object.entries(groupedWeeklyItems).map(([division, consultants]) => (
              <div key={division} style={styles.divisionBlock}>
                <h3 style={styles.divisionTitle}>{division}</h3>

                <div style={styles.consultantGrid}>
                  {Object.entries(consultants).map(([consultant, items]) => (
                    <div key={consultant} style={styles.consultantCard}>
                      <div style={styles.consultantHeader}>
                        {CONSULTANT_PHOTOS[consultant] ? (
                          <img
                            src={CONSULTANT_PHOTOS[consultant]}
                            alt={consultant}
                            style={styles.avatar}
                          />
                        ) : (
                          <div style={styles.avatarFallback}>
                            {consultant.slice(0, 1)}
                          </div>
                        )}

                        <div>
                          <p style={styles.consultantName}>{consultant}</p>
                          <p style={styles.smallMuted}>
                            {items.length} event{items.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div style={styles.eventList}>
                        {items.map((item) => (
                          <div key={item.id} style={styles.weeklyEvent}>
                            <strong>{item.facility}</strong>
                            <span>
                              {item.date} — {item.surveyType}
                            </span>
                            <em>{item.comments || "No comments entered"}</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={styles.standingContent}>
          <div style={styles.standingNote}>
            Best to worst is based on total deficiency points for current-year survey events that have parsed findings. Lower points are better.
          </div>

          <div style={styles.rankingList}>
            {facilityStanding.length === 0 ? (
              <p style={styles.emptyText}>
                No current-year parsed deficiency data available yet.
              </p>
            ) : (
              facilityStanding.map((consultant) => (
                <div key={consultant.consultant} style={styles.rankCard}>
                  <div style={styles.rankLeft}>
                    <div style={styles.rankNumber}>#{consultant.rank}</div>

                    {consultant.photo ? (
                      <img
                        src={consultant.photo}
                        alt={consultant.consultant}
                        style={styles.rankAvatar}
                      />
                    ) : (
                      <div style={styles.rankAvatarFallback}>
                        {consultant.consultant.slice(0, 1)}
                      </div>
                    )}

                    <div style={styles.rankNameBlock}>
                      <p style={styles.rankName}>{consultant.consultant}</p>
                      <p style={styles.rankDivision}>{consultant.division}</p>
                    </div>
                  </div>

                  <div style={styles.rankMiddle}>
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: consultant.barWidth,
                        }}
                      ></div>
                    </div>

                    <div style={styles.facilityMiniList}>
                      {consultant.facilities.length === 0 ? (
                        <span>No mapped current-year facility findings yet</span>
                      ) : (
                        consultant.facilities.slice(0, 4).map((facility) => (
                          <span key={facility.facility}>
                            {facility.facility}: {facility.points} pts
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={styles.rankStats}>
                    <strong>{consultant.totalPoints}</strong>
                    <span>points</span>
                    <strong>{consultant.deficiencyCount}</strong>
                    <span>deficiencies</span>
                    <strong>{consultant.surveyCount}</strong>
                    <span>surveys</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

const styles = {
  wrapper: {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(226,232,240,0.95)",
    borderRadius: "18px",
    padding: "12px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.055)",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "10px",
  },

  titleCluster: {
    minWidth: 0,
  },

  titleLine: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  kicker: {
    margin: 0,
    color: "#64748b",
    fontWeight: "900",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },

  eventBubble: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 9px",
    borderRadius: "999px",
    background: "#e0f2fe",
    color: "#075985",
    fontSize: "11px",
    fontWeight: "900",
  },

  title: {
    margin: "2px 0 0",
    fontSize: "20px",
    lineHeight: 1.1,
    letterSpacing: "-0.3px",
  },

  linkButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontWeight: "900",
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    padding: "4px 0",
    whiteSpace: "nowrap",
  },

  weeklyContent: {
    display: "grid",
    gap: "10px",
  },

  divisionBlock: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "10px",
  },

  divisionTitle: {
    margin: "0 0 8px",
    fontSize: "14px",
    color: "#334155",
    fontWeight: "900",
  },

  consultantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "8px",
  },

  consultantCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "9px",
  },

  consultantHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "999px",
    objectFit: "cover",
    border: "2px solid white",
    boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
  },

  avatarFallback: {
    width: "38px",
    height: "38px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dbeafe",
    color: "#1e40af",
    fontWeight: "900",
  },

  consultantName: {
    margin: 0,
    fontWeight: "900",
    fontSize: "13px",
  },

  smallMuted: {
    margin: "1px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
  },

  eventList: {
    display: "grid",
    gap: "6px",
  },

  weeklyEvent: {
    display: "grid",
    gap: "2px",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "7px",
    fontSize: "12px",
  },

  standingContent: {
    display: "grid",
    gap: "10px",
  },

  standingNote: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    borderRadius: "12px",
    padding: "8px 10px",
    fontSize: "12px",
    fontWeight: "800",
  },

  rankingList: {
    display: "grid",
    gap: "8px",
  },

  rankCard: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 0.8fr) minmax(260px, 1.3fr) minmax(110px, 0.35fr)",
    gap: "12px",
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "10px",
  },

  rankLeft: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: 0,
  },

  rankNumber: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    color: "#334155",
  },

  rankAvatar: {
    width: "44px",
    height: "44px",
    borderRadius: "999px",
    objectFit: "cover",
    border: "2px solid white",
    boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
  },

  rankAvatarFallback: {
    width: "44px",
    height: "44px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dbeafe",
    color: "#1e40af",
    fontWeight: "900",
  },

  rankNameBlock: {
    minWidth: 0,
  },

  rankName: {
    margin: 0,
    fontWeight: "900",
    fontSize: "14px",
  },

  rankDivision: {
    margin: "2px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "800",
  },

  rankMiddle: {
    display: "grid",
    gap: "6px",
  },

  barTrack: {
    width: "100%",
    height: "12px",
    borderRadius: "999px",
    background: "#e2e8f0",
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #2563eb, #60a5fa)",
  },

  facilityMiniList: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
  },

  rankStats: {
    display: "grid",
    gridTemplateColumns: "1fr",
    justifyItems: "end",
    gap: "1px",
    fontSize: "10px",
    color: "#64748b",
    fontWeight: "800",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "800",
  },
};
