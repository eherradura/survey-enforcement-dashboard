"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

const CURRENT_YEAR = new Date().getFullYear();

const DIVISIONS = { /* paste your full DIVISIONS object here */ };
const DIVISION_STYLES = { /* paste your full DIVISION_STYLES object here */ };
const CONSULTANT_PHOTOS = { /* paste your full CONSULTANT_PHOTOS object here */ };
const FACILITY_CONSULTANT_MAP = { /* paste your full FACILITY_CONSULTANT_MAP object here */ };

// ... paste all your helper functions here (normalizeFacilityName, getConsultantForSignificantEvent, getDivisionForConsultant, etc.)

// Styles defined first
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
  // ... paste ALL your remaining styles here (title, timeframeRow, divisionBlock, consultantGrid, consultantCard, cardSection, etc.)
};

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
    // ... your original groupedWeeklyItems logic here (the one you had before my changes)
  }, [weeklySummaryItems, weeklySignificantEvents]);

  // ... your other useMemo logic (facilityStanding, etc.)

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

            {/* Clickable significant event badge */}
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

      {/* your original grouped division + consultant tiles code unchanged */}
      <div style={styles.weeklyContent}>
        {/* ... the rest of your original return JSX for the grouped view */}
      </div>
    </section>
  );
}
