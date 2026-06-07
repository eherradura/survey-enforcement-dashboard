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
  // ... your full map here (copy from your original file)
};

// ... all your helper functions (normalizeFacilityName, getConsultantForSignificantEvent, getDivisionForConsultant, etc.) 

const styles = {
  wrapper: { /* your full styles object from the original file */ },
  // ... all your styles (headerRow, titleLine, eventBubble, significantBubble, divisionBlock, consultantCard, etc.)
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
    // your original groupedWeeklyItems logic
  }, [weeklySummaryItems, weeklySignificantEvents]);

  // your other useMemo logic...

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

          {/* your date range code */}
        </div>

        {/* your Facility Standing button */}
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
            <div key={division} style={{ ...styles.divisionBlock, background: divisionStyle.shellBackground, border: divisionStyle.border, borderLeft: `6px solid ${divisionStyle.accent}` }}>
              {/* division header with badges */}
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
                  <span style={{ ...styles.divisionBadge, background: divisionStyle.badgeBackground, color: divisionStyle.badgeText }}>
                    {divisionSurveyCount} survey
                  </span>
                  <span style={{ ...styles.divisionBadge, background: "#fff7ed", color: "#9a3412" }}>
                    {divisionSignificantCount} significant
                  </span>
                </div>
              </div>

              <div style={styles.consultantGrid}>
                {Object.entries(consultants).map(([consultant, data]) => {
                  const surveyItems = data.surveyActivity || [];
                  const significantItems = data.significantEvents || [];
                  return (
                    <div key={consultant} style={{ ...styles.consultantCard, background: divisionStyle.cardBackground }}>
                      {/* consultant header, survey activity, significant events tiles */}
                      {/* (your original tile code) */}
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
