"use client";

import { useMemo, useState } from "react";

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
    shellBackground:
      "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(255,255,255,0.98))",
    border: "1px solid #bfdbfe",
    accent: "#2563eb",
    softAccent: "#dbeafe",
    text: "#1e3a8a",
    cardBackground: "#ffffff",
    badgeBackground: "#dbeafe",
    badgeText: "#1e40af",
  },
  "Donna Kimura's Division": {
    shellBackground:
      "linear-gradient(135deg, rgba(240,253,244,0.98), rgba(255,255,255,0.98))",
    border: "1px solid #bbf7d0",
    accent: "#16a34a",
    softAccent: "#dcfce7",
    text: "#166534",
    cardBackground: "#ffffff",
    badgeBackground: "#dcfce7",
    badgeText: "#166534",
  },
  Unassigned: {
    shellBackground:
      "linear-gradient(135deg, rgba(248,250,252,0.98), rgba(255,255,255,0.98))",
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
  // Erick Herradura
  "PARK RETIREMENT": "Erick Herradura",
  "PARK REGENCY RETIREMENT": "Erick Herradura",
  "PARK REGENCY RETIREMENT CENTER": "Erick Herradura",
  "PARK REGENCY RETIREMENT ALF": "Erick Herradura",
  "PARK REGENCY RETIREMENT ALF PRR": "Erick Herradura",
  "PRR": "Erick Herradura",

  // Donna Kimura
  "BLOSSOM GROVE": "Donna Kimura",
  "BLOSSOM GROVE ALZHEIMERS SPECIAL CARE CENTER": "Donna Kimura",
  "BLOSSOM GROVE ALZHEIMER'S SPECIAL CARE CENTER": "Donna Kimura",
  "BLOSSOM GROVE ALZHEIMERS SPECIAL CARE CENTER ALF": "Donna Kimura",
  "BLOSSOM GROVE ALZHEIMER'S SPECIAL CARE CENTER ALF": "Donna Kimura",
  "DEL MAR": "Donna Kimura",
  "DEL MAR CONVALESCENT": "Donna Kimura",
  "DEL MAR CONVALESCENT HOSPITAL": "Donna Kimura",
  "DEL MAR CONVALESCENT CENTER": "Donna Kimura",

  // Brenda Rojas
  "NORTH VALLEY": "Brenda Rojas",
  "NORTH VALLEY NURSING CENTER": "Brenda Rojas",
  "NORBY VALLEY": "Brenda Rojas",
  "NORBY VALLEY NURSING CENTER": "Brenda Rojas",
  "HERITAGE MANOR": "Brenda Rojas",
  "PACIFIC": "Brenda Rojas",
  "PACIFIC POST-ACUTE": "Brenda Rojas",
  "PACIFIC POST ACUTE": "Brenda Rojas",
  "MONTEREY PARK": "Brenda Rojas",
  "MONTEREY PARK CONV HOSP": "Brenda Rojas",
  "MONTEREY PARK CONVALESCENT HOSPITAL": "Brenda Rojas",
  "TARZANA": "Brenda Rojas",
  "TARZANA HEALTH AND REHABILITATION CENTER": "Brenda Rojas",
  "VINELAND": "Brenda Rojas",
  "VINELAND POST ACUTE": "Brenda Rojas",
  "VINELAND POST-ACUTE": "Brenda Rojas",
  "THE MEADOWS ON SUNSET": "Brenda Rojas",
  "THE MEADOWS ON SUNSET POST ACUTE": "Brenda Rojas",
  "THE MEADOWS ON SUNSET POST-ACUTE": "Brenda Rojas",
  "SUNSET MANOR": "Brenda Rojas",

  // Jinkee Javier
  "COURTYARD": "Jinkee Javier",
  "COURTYARD CARE CENTER": "Jinkee Javier",
  "CRESCENT CITY": "Jinkee Javier",
  "CRESCENT CITY CARE CENTER": "Jinkee Javier",
  "DIAMOND RIDGE": "Jinkee Javier",
  "DIAMOND RIDGE HEALTHCARE CENTER": "Jinkee Javier",
  "EXCELL": "Jinkee Javier",
  "EXCEL": "Jinkee Javier",
  "EXCEL HEALTHCARE CENTER": "Jinkee Javier",
  "EXCELL HEALTHCARE CENTER": "Jinkee Javier",
  "MADERA": "Jinkee Javier",
  "MADEIRA": "Jinkee Javier",
  "MADERA CARE CENTER": "Jinkee Javier",
  "MADEIRA CARE CENTER": "Jinkee Javier",
  "MISSION CARMICHAEL": "Jinkee Javier",
  "MISSION CARMICHAEL HEALTHCARE CENTER": "Jinkee Javier",

  // Beth Clark
  "ALCOTT": "Beth Clark",
  "ALCOTT REHABILITATION HOSPITAL": "Beth Clark",
  "COUNTRY OAKS": "Beth Clark",
  "COUNTRY OAKS CARE CENTER": "Beth Clark",
  "COUNTRY OAKS CARE CENTER SUB-ACUTE": "Beth Clark",
  "COUNTRY OAKS CARE CENTER SUB ACUTE": "Beth Clark",
  "COLLEGE VISTA": "Beth Clark",
  "COLLEGE VISTA POST-ACUTE": "Beth Clark",
  "COLLEGE VISTA POST ACUTE": "Beth Clark",
  "POMONA VISTA": "Beth Clark",
  "POMONA VISTA CARE CENTER": "Beth Clark",
  "SUN MAR NURSING": "Beth Clark",
  "SUN MAR NURSING CENTER": "Beth Clark",
  "SUNNYSIDE": "Beth Clark",
  "SUNNYSIDE CONV HOSPITAL": "Beth Clark",
  "SUNNYSIDE CONVALESCENT HOSPITAL": "Beth Clark",
  "SUNSET MANOR CONVALESCENT HOSPITAL": "Beth Clark",
  "SUNSET MANOR CONV HOSP": "Beth Clark",

  // Guillermo Vicencio
  "ANAHEIM": "Guillermo Vicencio",
  "ANAHEIM HEALTHCARE CENTER": "Guillermo Vicencio",
  "BONITA HILLS": "Guillermo Vicencio",
  "BONITA HILLS POST-ACUTE": "Guillermo Vicencio",
  "BONITA HILLS POST ACUTE": "Guillermo Vicencio",
  "FRENCH PARK": "Guillermo Vicencio",
  "FRENCH PARK CARE CENTER": "Guillermo Vicencio",
  "GORDON LANE": "Guillermo Vicencio",
  "GORDON LANE CARE CENTER": "Guillermo Vicencio",
  "PARK REGENCY CARE": "Guillermo Vicencio",
  "PARK REGENCY CARE CENTER": "Guillermo Vicencio",
  "PELICAN RIDGE": "Guillermo Vicencio",
  "PELICAN RIDGE POST-ACUTE": "Guillermo Vicencio",
  "PELICAN RIDGE POST ACUTE": "Guillermo Vicencio",

  // Melissa Acuna
  "CITRUS": "Melissa Acuna",
  "CITRUS NURSING CENTER": "Melissa Acuna",
  "CCRC": "Melissa Acuna",
  "COMMUNITY CARE AND REHABILITATION CENTER": "Melissa Acuna",
  "COMMUNITY CARE": "Melissa Acuna",
  "MENIFEE": "Melissa Acuna",
  "MENIFEE LAKES POST-ACUTE": "Melissa Acuna",
  "MENIFEE LAKES POST ACUTE": "Melissa Acuna",
  "TRABUCO": "Melissa Acuna",
  "TRABUCO HILLS POST-ACUTE": "Melissa Acuna",
  "TRABUCO HILLS POST ACUTE": "Melissa Acuna",
  "VICTORIA": "Melissa Acuna",
  "VICTORIA CARE CENTER": "Melissa Acuna",
  "MISSION CARE": "Melissa Acuna",
  "MISSION CARE CENTER": "Melissa Acuna",

  // Gerly Orona
  "EXTENDED CARE": "Gerly Orona",
  "EXTENDED CARE HOSPITAL OF RIVERSIDE": "Gerly Orona",
  "GARDEN PARK": "Gerly Orona",
  "GARDEN PARK CARE CENTER": "Gerly Orona",
  "MOUNTAIN VIEW": "Gerly Orona",
  "MOUNTAIN VIEW POST-ACUTE": "Gerly Orona",
  "MOUNTAIN VIEW POST ACUTE": "Gerly Orona",
  "OCEAN VIEW": "Gerly Orona",
  "OCEAN VIEW POST-ACUTE": "Gerly Orona",
  "OCEAN VIEW POST ACUTE": "Gerly Orona",
  "VILLA RANCHO BERNARDO": "Gerly Orona",
  "VILLA RANCHO BERNARDO CARE CENTER": "Gerly Orona",
  "VISTA VIEW": "Gerly Orona",
  "VISTA VIEW POST-ACUTE": "Gerly Orona",
  "VISTA VIEW POST ACUTE": "Gerly Orona",

  // Sammy Balisbis
  "VILLA DEL SOL": "Sammy Balisbis",
  "VILLA DEL SOL POST-ACUTE": "Sammy Balisbis",
  "VILLA DEL SOL POST ACUTE": "Sammy Balisbis",
  "THE GROVE": "Sammy Balisbis",
  "THE GROVE POST-ACUTE": "Sammy Balisbis",
  "THE GROVE POST ACUTE": "Sammy Balisbis",
  "SIERRA VIEW": "Sammy Balisbis",
  "SIERRA VIEW CARE CENTER": "Sammy Balisbis",
  "COTTAGE CREST": "Sammy Balisbis",
  "COTTAGE CREST POST-ACUTE": "Sammy Balisbis",
  "COTTAGE CREST POST ACUTE": "Sammy Balisbis",
  "PARAMOUNT": "Sammy Balisbis",
  "PARAMOUNT CONVALESCENT HOSPITAL": "Sammy Balisbis",
  "SUNNY HILLS": "Sammy Balisbis",
  "SUNNY HILLS POST-ACUTE": "Sammy Balisbis",
  "SUNNY HILLS POST ACUTE": "Sammy Balisbis",
  "SEAVIEW": "Sammy Balisbis",
  "SEAVIEW CARE CENTER": "Sammy Balisbis",
  "EDUTRACK": "Sammy Balisbis",
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
        ftag:
          deficiency.ftag ||
          deficiency.tag ||
          deficiency.fTag ||
          deficiency.FTag ||
          null,
        scopeSeverity:
          deficiency.scopeSeverity ||
          deficiency.severity ||
          deficiency.scopeAndSeverity ||
          deficiency.scope_severity ||
          null,
      }))
      .filter((item) => item.ftag);
  }

  if (Array.isArray(parsed.ftags) && parsed.ftags.length > 0) {
    return parsed.ftags
      .map((item) => {
        const text = String(item || "").trim();
        const match = text.match(/\b(F\d{3,4})\b\s*[-–—:]?\s*([A-L])?/i);

        return {
          ftag: match?.[1]?.toUpperCase() || text,
          scopeSeverity: match?.[2]?.toUpperCase() || null,
        };
      })
      .filter((item) => item.ftag);
  }

  const summaryText = [
    parsed.deficiencySummary,
    parsed.severitySummary,
    parsed.findingsSummary,
    parsed.summary,
  ]
    .filter(Boolean)
    .join(", ");

  if (summaryText) {
    const matches = Array.from(
      summaryText.matchAll(/\b(F\d{3,4})\b\s*[-–—:]?\s*([A-L])?/gi)
    );

    return matches.map((match) => ({
      ftag: match[1].toUpperCase(),
      scopeSeverity: match[2]?.toUpperCase() || null,
    }));
  }

  return [];
}

function calculateSubmissionPoints(parsedFindings) {
  let totalPoints = 0;
  let deficiencyCount = 0;

  const countedDeficiencies = new Set();

  parsedFindings.forEach((parsed) => {
    const deficiencies = normalizeDeficiencyList(parsed);

    deficiencies.forEach((deficiency) => {
      const ftag = String(deficiency.ftag || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

      const severity = String(deficiency.scopeSeverity || "")
        .trim()
        .toUpperCase();

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

  const facilityStanding = useMemo(() => {
    const consultantMap = {};

    Object.entries(DIVISIONS).forEach(([division, consultants]) => {
      consultants.forEach((consultant) => {
        consultantMap[consultant] = {
          consultant,
          division,
          totalPoints: 0,
          deficiencyCount: 0,
          surveyCount: 0,
          facilities: new Map(),
        };
      });
    });

    consultantMap.Unassigned = {
      consultant: "Unassigned",
      division: "Unassigned",
      totalPoints: 0,
      deficiencyCount: 0,
      surveyCount: 0,
      facilities: new Map(),
    };

    submissions.forEach((submission) => {
      const answers = submission.answers || {};
      const facility = getAnswer
        ? getAnswer(answers, "3")
        : answers?.["3"]?.answer;

      const surveyDate = getAnswer
        ? getAnswer(answers, "5")
        : answers?.["5"]?.answer;

      const surveyYear = getYearFromDateValue(surveyDate);

      if (surveyYear !== CURRENT_YEAR) return;

      const consultant = getConsultantForFacility(facility);
      const parsedFindings = getParsedFindingsForSubmission(
        parsedDocs,
        submission.id
      );

      const pointsSummary = calculateSubmissionPoints(parsedFindings);

      if (!consultantMap[consultant]) {
        consultantMap[consultant] = {
          consultant,
          division: getDivisionForConsultant(consultant),
          totalPoints: 0,
          deficiencyCount: 0,
          surveyCount: 0,
          facilities: new Map(),
        };
      }

      consultantMap[consultant].surveyCount += 1;
      consultantMap[consultant].totalPoints += pointsSummary.totalPoints;
      consultantMap[consultant].deficiencyCount +=
        pointsSummary.deficiencyCount;

      const facilityKey = facility || "Unknown Facility";

      if (!consultantMap[consultant].facilities.has(facilityKey)) {
        consultantMap[consultant].facilities.set(facilityKey, {
          facility: facilityKey,
          points: 0,
          deficiencyCount: 0,
          surveyCount: 0,
        });
      }

      const facilityRecord =
        consultantMap[consultant].facilities.get(facilityKey);

      facilityRecord.points += pointsSummary.totalPoints;
      facilityRecord.deficiencyCount += pointsSummary.deficiencyCount;
      facilityRecord.surveyCount += 1;
    });

    return Object.values(consultantMap)
      .filter((item) => item.consultant !== "Unassigned" || item.surveyCount > 0)
      .map((item) => ({
        ...item,
        facilities: Array.from(item.facilities.values()).sort(
          (a, b) => b.points - a.points
        ),
      }))
      .sort((a, b) => {
        if (a.totalPoints !== b.totalPoints) {
          return a.totalPoints - b.totalPoints;
        }

        if (a.deficiencyCount !== b.deficiencyCount) {
          return a.deficiencyCount - b.deficiencyCount;
        }

        if (a.surveyCount !== b.surveyCount) {
          return b.surveyCount - a.surveyCount;
        }

        return a.consultant.localeCompare(b.consultant);
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }, [submissions, parsedDocs, getAnswer]);

  if (isStandingView) {
    return (
      <section style={styles.wrapper}>
        <div style={styles.standingHeaderRow}>
          <div>
            <h2 style={styles.standingTitle}>
              Facility Standing for {CURRENT_YEAR}
            </h2>
            <p style={styles.standingSubtitle}>
              Best to worst consultant ranking based on current-year total
              deficiency points from parsed/scrubbed findings for assigned
              facilities.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onDashboardViewChange?.("weekly")}
            style={styles.primaryTextButton}
          >
            Back to Weekly Summary
          </button>
        </div>

        <div style={styles.standingContent}>
          {facilityStanding.length === 0 ? (
            <p style={styles.emptyText}>
              No current-year parsed deficiency data available yet.
            </p>
          ) : (
            facilityStanding.map((consultant) => {
              const divisionStyle = getDivisionStyle(consultant.division);

              return (
                <div
                  key={consultant.consultant}
                  style={{
                    ...styles.standingRankCard,
                    borderLeft: `7px solid ${divisionStyle.accent}`,
                  }}
                >
                  <div style={styles.standingConsultantBlock}>
                    <div
                      style={{
                        ...styles.standingRankNumber,
                        background: divisionStyle.softAccent,
                        color: divisionStyle.text,
                      }}
                    >
                      #{consultant.rank}
                    </div>

                    <ConsultantAvatar
                      consultant={consultant.consultant}
                      size={82}
                    />

                    <div style={styles.standingNameBlock}>
                      <p style={styles.standingConsultantName}>
                        {consultant.consultant}
                      </p>
                      <p style={styles.standingDivisionName}>
                        {consultant.division}
                      </p>
                    </div>
                  </div>

                  <div style={styles.standingFacilityBlock}>
                    {consultant.facilities.length === 0 ? (
                      <div style={styles.noFacilityFindings}>
                        No parsed current-year findings for assigned facilities
                        yet
                      </div>
                    ) : (
                      consultant.facilities.map((facility) => (
                        <div key={facility.facility} style={styles.facilityRow}>
                          <span style={styles.facilityName}>
                            {facility.facility}
                          </span>
                          <span style={styles.facilityPoints}>
                            {facility.points} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={styles.totalPointsBlock}>
                    <span style={styles.totalPointsNumber}>
                      {consultant.totalPoints}
                    </span>
                    <span style={styles.totalPointsLabel}>Total Points</span>
                    <span style={styles.totalPointsMeta}>
                      {consultant.deficiencyCount} deficiencies ·{" "}
                      {consultant.surveyCount} surveys
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    );
  }

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

            <span style={styles.significantBubble}>{significantEventCount}</span>
            <span style={styles.significantBubbleLabel}>
              {significantEventCount === 1
                ? "significant event"
                : "significant events"}
            </span>
          </div>

          <div style={styles.timeframeRow}>
            <h2 style={styles.title}>Date Range</h2>

            <div style={styles.dateRangeControls}>
              <label style={styles.dateLabel}>
                From
                <input
                  type="date"
                  value={weeklyDateRange.start || ""}
                  onChange={(event) =>
                    onWeeklyDateRangeChange?.({
                      ...weeklyDateRange,
                      start: event.target.value,
                    })
                  }
                  style={styles.dateInput}
                />
              </label>

              <label style={styles.dateLabel}>
                To
                <input
                  type="date"
                  value={weeklyDateRange.end || ""}
                  onChange={(event) =>
                    onWeeklyDateRangeChange?.({
                      ...weeklyDateRange,
                      end: event.target.value,
                    })
                  }
                  style={styles.dateInput}
                />
              </label>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDashboardViewChange?.("standing")}
          style={styles.primaryTextButton}
        >
          Facility Standing
        </button>
      </div>

      <div style={styles.weeklyContent}>
        {weeklyEventCount === 0 && significantEventCount === 0 && (
          <p style={styles.emptyText}>
            No survey activity or significant events for the selected date
            range.
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
                  <h3
                    style={{
                      ...styles.divisionTitle,
                      color: divisionStyle.text,
                    }}
                  >
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

const styles = {
  wrapper: {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(226,232,240,0.95)",
    borderRadius: "18px",
    padding: "14px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.055)",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "12px",
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
    minWidth: "42px",
    height: "32px",
    padding: "0 12px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #2563eb, #38bdf8)",
    color: "white",
    fontSize: "18px",
    lineHeight: 1,
    fontWeight: "950",
    boxShadow: "0 6px 14px rgba(37,99,235,0.22)",
  },

  eventBubbleLabel: {
    color: "#075985",
    fontSize: "13px",
    fontWeight: "900",
    background: "#e0f2fe",
    padding: "7px 10px",
    borderRadius: "999px",
  },

  significantBubble: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "42px",
    height: "32px",
    padding: "0 12px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #ea580c, #fb923c)",
    color: "white",
    fontSize: "18px",
    lineHeight: 1,
    fontWeight: "950",
    boxShadow: "0 6px 14px rgba(234,88,12,0.22)",
  },

  significantBubbleLabel: {
    color: "#9a3412",
    fontSize: "13px",
    fontWeight: "900",
    background: "#ffedd5",
    padding: "7px 10px",
    borderRadius: "999px",
  },

  title: {
    margin: "4px 0 0",
    fontSize: "22px",
    lineHeight: 1.1,
    letterSpacing: "-0.3px",
  },

  timeframeRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "4px",
  },

  dateRangeControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  dateLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "900",
  },

  dateInput: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: "900",
    fontSize: "12px",
    borderRadius: "999px",
    padding: "7px 10px",
    outline: "none",
    cursor: "pointer",
  },

  primaryTextButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: "900",
    fontSize: "13px",
    cursor: "pointer",
    borderRadius: "999px",
    padding: "8px 12px",
    whiteSpace: "nowrap",
  },

  weeklyContent: {
    display: "grid",
    gap: "12px",
  },

  divisionBlock: {
    borderRadius: "16px",
    padding: "12px",
    boxShadow: "0 8px 18px rgba(15,23,42,0.045)",
  },

  divisionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },

  divisionTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "950",
    letterSpacing: "-0.1px",
  },

  divisionSubtext: {
    margin: "2px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "750",
  },

  divisionBadgeGroup: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  divisionBadge: {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "11px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  consultantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
    gap: "10px",
  },

  consultantCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "10px",
    minHeight: "92px",
    boxShadow: "0 4px 10px rgba(15,23,42,0.025)",
  },

  consultantHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
    textAlign: "left",
  },

  consultantTextBlock: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },

  consultantName: {
    margin: 0,
    fontWeight: "950",
    fontSize: "16px",
    lineHeight: 1.15,
    letterSpacing: "-0.2px",
  },

  smallMuted: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "850",
  },

  cardSection: {
    display: "grid",
    gap: "7px",
    marginTop: "9px",
  },

  sectionMiniHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  sectionMiniTitle: {
    margin: 0,
    fontSize: "12px",
    fontWeight: "950",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  sectionDotBlue: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    background: "#2563eb",
    flexShrink: 0,
  },

  sectionDotOrange: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    background: "#ea580c",
    flexShrink: 0,
  },

  noConsultantEvents: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "850",
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "10px",
    padding: "8px",
    textAlign: "center",
  },

  noSignificantEvents: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "12px",
    fontWeight: "850",
    background: "#fff7ed",
    border: "1px dashed #fed7aa",
    borderRadius: "10px",
    padding: "8px",
    textAlign: "center",
  },

  eventList: {
    display: "grid",
    gap: "6px",
    textAlign: "left",
  },

  weeklyEvent: {
    display: "grid",
    gap: "3px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "8px",
    fontSize: "12px",
  },

  significantEvent: {
    display: "grid",
    gap: "3px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "10px",
    padding: "8px",
    fontSize: "12px",
  },

  eventTopLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
  },

  eventSurveyType: {
    margin: 0,
    color: "#334155",
    fontWeight: "800",
    fontSize: "11px",
  },

  significantComment: {
    margin: 0,
    color: "#7c2d12",
    fontWeight: "750",
    fontSize: "12px",
    lineHeight: 1.35,
    whiteSpace: "pre-wrap",
  },

  standingHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "16px",
  },

  standingTitle: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1.05,
    letterSpacing: "-0.8px",
    fontWeight: "950",
  },

  standingSubtitle: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "750",
    maxWidth: "850px",
  },

  standingContent: {
    display: "grid",
    gap: "12px",
  },

  standingRankCard: {
    display: "grid",
    gridTemplateColumns:
      "minmax(260px, 0.85fr) minmax(420px, 1.4fr) minmax(160px, 0.35fr)",
    gap: "18px",
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 8px 18px rgba(15,23,42,0.045)",
  },

  standingConsultantBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textAlign: "left",
  },

  standingRankNumber: {
    borderRadius: "999px",
    padding: "5px 12px",
    fontSize: "14px",
    fontWeight: "950",
    flexShrink: 0,
  },

  standingNameBlock: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },

  standingConsultantName: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "950",
    letterSpacing: "-0.5px",
    lineHeight: 1.1,
  },

  standingDivisionName: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "850",
  },

  standingFacilityBlock: {
    display: "grid",
    gap: "7px",
  },

  facilityRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "9px 12px",
  },

  facilityName: {
    fontSize: "14px",
    fontWeight: "900",
    color: "#1e293b",
  },

  facilityPoints: {
    fontSize: "14px",
    fontWeight: "950",
    color: "#0f172a",
    whiteSpace: "nowrap",
  },

  noFacilityFindings: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "14px",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "850",
    textAlign: "center",
  },

  totalPointsBlock: {
    display: "grid",
    justifyItems: "end",
    textAlign: "right",
    gap: "3px",
  },

  totalPointsNumber: {
    fontSize: "42px",
    fontWeight: "950",
    letterSpacing: "-1px",
    color: "#0f172a",
    lineHeight: 1,
  },

  totalPointsLabel: {
    fontSize: "12px",
    fontWeight: "950",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  totalPointsMeta: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#64748b",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "800",
  },
};
