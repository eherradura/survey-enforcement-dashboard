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
  // ... your full FACILITY_CONSULTANT_MAP here (copy from your original file)
  // (I omitted it for brevity — paste your full map here)
};

 // ... all your helper functions (normalizeFacilityName, getConsultantForSignificantEvent, etc.) — keep them exactly as they were

// Styles defined FIRST so Next.js prerendering works
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
  // ... paste the rest of your styles object here (title, timeframeRow, divisionBlock, consultantGrid, etc.)
  // (copy everything from your original styles object)
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

  // ... all your useMemo logic stays exactly the same as your original code

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

            {/* Hyperlink added here */}
            <Link href="/missing-don-reports" style={{ textDecoration: "none" }}>
              <span style={styles.significantBubble}>{significantEventCount}</span>
            </Link>
            <span style={styles.significantBubbleLabel}>
              {significantEventCount === 1 ? "significant event" : "significant events"}
            </span>
          </div>

          {/* your date range code unchanged */}
        </div>

        {/* your Facility Standing button unchanged */}
      </div>

      {/* the rest of your component (division blocks, consultant cards, etc.) unchanged */}
    </section>
  );
}
