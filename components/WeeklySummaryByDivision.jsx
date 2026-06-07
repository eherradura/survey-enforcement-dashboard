"use client";
import { useMemo, useState } from "react";
import Link from "next/link";   // ← Added this

// ... (all your existing constants and functions remain unchanged)

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

  // ... (all your existing useMemo and logic stays exactly the same)

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

            {/* UPDATED: Made the significant event a clickable link */}
            <Link href="/missing-don-reports" style={{ textDecoration: "none" }}>
              <span style={styles.significantBubble}>{significantEventCount}</span>
            </Link>
            <span style={styles.significantBubbleLabel}>
              {significantEventCount === 1 ? "significant event" : "significant events"}
            </span>
          </div>

          {/* rest of your code unchanged */}
          <div style={styles.timeframeRow}>
            {/* ... date range ... */}
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

      {/* rest of your component unchanged */}
      <div style={styles.weeklyContent}>
        {/* ... all the division and consultant cards ... */}
      </div>
    </section>
  );
}

// ... your styles object remains the same
