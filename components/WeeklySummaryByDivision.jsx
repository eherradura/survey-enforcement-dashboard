"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

const CURRENT_YEAR = new Date().getFullYear();

const DIVISIONS = { /* your full DIVISIONS */ };
const DIVISION_STYLES = { /* your full DIVISION_STYLES */ };
const CONSULTANT_PHOTOS = { /* your full CONSULTANT_PHOTOS */ };
const FACILITY_CONSULTANT_MAP = { /* your full FACILITY_CONSULTANT_MAP */ };

// ... all your helper functions (normalizeFacilityName, getConsultantForSignificantEvent, etc.)

const styles = {
  // ... your full styles object
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
    // your original groupedWeeklyItems logic here
    // (make sure it always returns an object)
  }, [weeklySummaryItems, weeklySignificantEvents]) || {};   // ← safeguard

  // ... your other useMemo logic with || {} safeguards if needed

  return (
    <section style={styles.wrapper}>
      {/* ... your header with the Link on significantBubble (as before) */}

      <div style={styles.weeklyContent}>
        {weeklyEventCount === 0 && significantEventCount === 0 && (
          <p style={styles.emptyText}>
            No survey activity or significant events for the selected date range.
          </p>
        )}

        {Object.entries(groupedWeeklyItems).map(([division, consultants]) => {
          // ... your original division rendering code
        })}
      </div>
    </section>
  );
}
