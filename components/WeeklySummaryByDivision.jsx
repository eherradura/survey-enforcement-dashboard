"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

const CURRENT_YEAR = new Date().getFullYear();

const DIVISIONS = { /* ... your full DIVISIONS object ... */ };
const DIVISION_STYLES = { /* ... your full DIVISION_STYLES object ... */ };
const CONSULTANT_PHOTOS = { /* ... your full CONSULTANT_PHOTOS object ... */ };
const FACILITY_CONSULTANT_MAP = { /* ... your full FACILITY_CONSULTANT_MAP object ... */ };

// ... (keep all your helper functions exactly as they were: normalizeFacilityName, getConsultantForSignificantEvent, etc.)

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

  const groupedWeeklyItems = useMemo(() => { /* ... your existing groupedWeeklyItems logic ... */ }, [weeklySummaryItems, weeklySignificantEvents]);

  // ... keep all your other useMemo logic exactly the same

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

            {/* FIXED: Hyperlink added + styles now properly scoped */}
            <Link href="/missing-don-reports" style={{ textDecoration: "none" }}>
              <span style={styles.significantBubble}>{significantEventCount}</span>
            </Link>
            <span style={styles.significantBubbleLabel}>
              {significantEventCount === 1 ? "significant event" : "significant events"}
            </span>
          </div>

          {/* rest of your date range and button code unchanged */}
        </div>
      </div>

      {/* rest of your component (division blocks, etc.) unchanged */}
    </section>
  );
}

// Styles moved to the bottom and exported so they are always available
const styles = {
  wrapper: { /* ... your full styles object from before ... */ },
  // ... all your other styles (headerRow, titleLine, significantBubble, etc.)
};

export { styles }; // optional, but helps with reusability
