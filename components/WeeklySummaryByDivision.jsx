"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CONSULTANT_PHOTOS,
  DIVISIONS,
  defaultFromDate,
  defaultToDate,
  extractEventDateAndText,
  formatDisplayDate,
  getConsultantByFacility,
  getDivisionByConsultant,
  getSignificantCommentText,
  getSignificantFacilityName,
  getSignificantSubmittedDate,
  getSurveyComments,
  getSurveyDate,
  getSurveyFacilityName,
  getSurveyType,
  hasMeaningfulText,
  isDateWithinRange,
} from "../app/lib/dashboardAssignments";

export default function WeeklySummaryByDivision(props) {
  const surveyItems =
    props.items ||
    props.weeklySummaryItems ||
    props.filteredItems ||
    props.surveyItems ||
    [];

  const significantSource =
    props.significantEvents ||
    props.rncComments ||
    props.significantItems ||
    props.commentItems ||
    [];

  const [fromDate, setFromDate] = useState(props.fromDate || defaultFromDate());
  const [toDate, setToDate] = useState(props.toDate || defaultToDate());

  const processedSurveyItems = useMemo(() => {
    return (surveyItems || [])
      .map((item) => {
        const facilityName = getSurveyFacilityName(item);
        const consultant = getConsultantByFacility(facilityName);
        const division = getDivisionByConsultant(consultant);

        return {
          ...item,
          facilityName,
          consultant,
          divisionName: division?.name || "Unassigned",
          surveyType: getSurveyType(item),
          comments: getSurveyComments(item),
          displayDate: formatDisplayDate(getSurveyDate(item), "-"),
          rawDate: getSurveyDate(item),
        };
      })
      .filter((item) => isDateWithinRange(item.rawDate, fromDate, toDate))
      .sort((a, b) => {
        const aTime = new Date(a.rawDate || 0).getTime();
        const bTime = new Date(b.rawDate || 0).getTime();
        return bTime - aTime;
      });
  }, [surveyItems, fromDate, toDate]);

  const processedSignificantItems = useMemo(() => {
    return (significantSource || [])
      .map((item) => {
        const facilityName = getSignificantFacilityName(item);
        const rawComment = getSignificantCommentText(item);

        if (!hasMeaningfulText(rawComment)) return null;

        const submittedDate = getSignificantSubmittedDate(item);
        const parsed = extractEventDateAndText(rawComment, submittedDate);

        const consultant = getConsultantByFacility(facilityName);
        const division = getDivisionByConsultant(consultant);

        return {
          ...item,
          facilityName,
          consultant,
          divisionName: division?.name || "Unassigned",
          rawDate: parsed.eventDate,
          displayDate: parsed.displayDate,
          text: parsed.cleanedText,
        };
      })
      .filter(Boolean)
      .filter((item) => hasMeaningfulText(item.text))
      .filter((item) => isDateWithinRange(item.rawDate, fromDate, toDate))
      .sort((a, b) => {
        const aTime = new Date(a.rawDate || 0).getTime();
        const bTime = new Date(b.rawDate || 0).getTime();
        return bTime - aTime;
      });
  }, [significantSource, fromDate, toDate]);

  const surveyCount = processedSurveyItems.length;
  const significantCount = processedSignificantItems.length;

  const consultantSummary = useMemo(() => {
    const summary = {};

    DIVISIONS.forEach((division) => {
      division.consultants.forEach((consultant) => {
        summary[consultant] = {
          consultant,
          divisionName: division.name,
          survey: [],
          significant: [],
        };
      });
    });

    processedSurveyItems.forEach((item) => {
      if (!summary[item.consultant]) {
        summary[item.consultant] = {
          consultant: item.consultant,
          divisionName: "Unassigned",
          survey: [],
          significant: [],
        };
      }
      summary[item.consultant].survey.push(item);
    });

    processedSignificantItems.forEach((item) => {
      if (!summary[item.consultant]) {
        summary[item.consultant] = {
          consultant: item.consultant,
          divisionName: "Unassigned",
          survey: [],
          significant: [],
        };
      }
      summary[item.consultant].significant.push(item);
    });

    return summary;
  }, [processedSurveyItems, processedSignificantItems]);

  const significantLink = `/missing-don-weekly-report?from=${fromDate}&to=${toDate}`;

  return (
    <div style={styles.wrapper}>
      <div style={styles.topBar}>
        <div style={styles.countRow}>
          <div style={styles.countGroup}>
            <div style={styles.bluePillLabel}>Survey Events</div>
            <div style={styles.bluePillNumber}>{surveyCount}</div>
          </div>

          <Link href={significantLink} style={styles.linkReset}>
            <div style={styles.countGroup}>
              <div style={styles.orangePillLabel}>Significant Events</div>
              <div style={styles.orangePillNumber}>{significantCount}</div>
            </div>
          </Link>
        </div>

        <Link href="/facility-standing" style={styles.facilityStandingBtn}>
          Facility Standing
        </Link>
      </div>

      <div style={styles.dateRangeWrap}>
        <div style={styles.dateRangeTitle}>Date Range</div>

        <div style={styles.dateControl}>
          <span style={styles.dateLabel}>From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>

        <div style={styles.dateControl}>
          <span style={styles.dateLabel}>To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>
      </div>

      {DIVISIONS.map((division) => {
        const divisionConsultants = division.consultants.map(
          (consultant) => consultantSummary[consultant]
        );

        const divisionSurveyCount = divisionConsultants.reduce(
          (sum, consultant) => sum + (consultant?.survey?.length || 0),
          0
        );

        const divisionSignificantCount = divisionConsultants.reduce(
          (sum, consultant) => sum + (consultant?.significant?.length || 0),
          0
        );

        return (
          <section
            key={division.name}
            style={{
              ...styles.divisionSection,
              borderColor: division.accent,
              background: division.bg,
            }}
          >
            <div style={styles.divisionHeader}>
              <div>
                <div style={{ ...styles.divisionTitle, color: division.accent }}>
                  {division.title}
                </div>
                <div style={styles.divisionSubtitle}>
                  Survey Activity And Significant Events By Assigned Consultant
                </div>
              </div>

              <div style={styles.divisionCountWrap}>
                <div style={styles.divisionCountBlue}>
                  {divisionSurveyCount} Survey
                </div>
                <div style={styles.divisionCountOrange}>
                  {divisionSignificantCount} Significant
                </div>
              </div>
            </div>

            <div style={styles.consultantGrid}>
              {divisionConsultants.map((consultantData) => (
                <div key={consultantData.consultant} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <img
                      src={
                        CONSULTANT_PHOTOS[consultantData.consultant] ||
                        "/consultants/.gitkeep"
                      }
                      alt={consultantData.consultant}
                      style={styles.photo}
                    />

                    <div style={styles.consultantName}>
                      {consultantData.consultant}
                    </div>

                    <div style={styles.consultantSubCount}>
                      {consultantData.survey.length} Survey •{" "}
                      {consultantData.significant.length} Significant
                    </div>
                  </div>

                  <div style={styles.sectionBlock}>
                    <div style={styles.sectionTitle}>
                      <span style={styles.blueDot} />
                      Survey Activity
                    </div>

                    {consultantData.survey.length === 0 ? (
                      <div style={styles.emptyBox}>
                        No Survey Activity This Period
                      </div>
                    ) : (
                      consultantData.survey.map((item, index) => (
                        <div key={`${item.facilityName}-${index}`} style={styles.itemBox}>
                          <div style={styles.itemTopRow}>
                            <div style={styles.itemFacility}>{item.facilityName}</div>
                            <div style={styles.itemDate}>{item.displayDate}</div>
                          </div>
                          <div style={styles.itemType}>{item.surveyType}</div>
                          {hasMeaningfulText(item.comments) && (
                            <div style={styles.itemComment}>{item.comments}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div style={styles.sectionBlock}>
                    <div style={styles.sectionTitle}>
                      <span style={styles.orangeDot} />
                      Significant Events
                    </div>

                    {consultantData.significant.length === 0 ? (
                      <div style={styles.emptyBoxOrange}>
                        No Significant Events This Period
                      </div>
                    ) : (
                      consultantData.significant.map((item, index) => (
                        <div
                          key={`${item.facilityName}-significant-${index}`}
                          style={styles.significantBox}
                        >
                          <div style={styles.itemTopRow}>
                            <div style={styles.itemFacility}>{item.facilityName}</div>
                            <div style={styles.itemDateSlash}>{item.displayDate}</div>
                          </div>
                          <div style={styles.significantText}>{item.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginTop: "14px",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  countRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  countGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  linkReset: {
    textDecoration: "none",
  },

  bluePillLabel: {
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 800,
    fontSize: "14px",
  },

  bluePillNumber: {
    background: "#3b82f6",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "8px 14px",
    minWidth: "44px",
    textAlign: "center",
    fontWeight: 900,
    fontSize: "18px",
  },

  orangePillLabel: {
    background: "#ffedd5",
    color: "#c2410c",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 800,
    fontSize: "14px",
  },

  orangePillNumber: {
    background: "#f97316",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "8px 14px",
    minWidth: "44px",
    textAlign: "center",
    fontWeight: 900,
    fontSize: "18px",
  },

  facilityStandingBtn: {
    textDecoration: "none",
    background: "#f8fbff",
    border: "1px solid #bcd2ff",
    color: "#1d4ed8",
    fontWeight: 800,
    padding: "10px 16px",
    borderRadius: "999px",
  },

  dateRangeWrap: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  dateRangeTitle: {
    fontSize: "16px",
    fontWeight: 900,
    color: "#1f2937",
  },

  dateControl: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  dateLabel: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#475569",
  },

  dateInput: {
    border: "1px solid #bfd0ea",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#1d4ed8",
    background: "#f8fbff",
  },

  divisionSection: {
    border: "2px solid",
    borderRadius: "18px",
    padding: "16px",
  },

  divisionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },

  divisionTitle: {
    fontSize: "26px",
    fontWeight: 900,
    lineHeight: 1.2,
  },

  divisionSubtitle: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
    marginTop: "2px",
    textTransform: "none",
  },

  divisionCountWrap: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  divisionCountBlue: {
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 900,
  },

  divisionCountOrange: {
    background: "#ffedd5",
    color: "#c2410c",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 900,
  },

  consultantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "14px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #d9e3f0",
    borderRadius: "16px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },

  cardHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "6px",
  },

  photo: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #ffffff",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.15)",
    background: "#e2e8f0",
  },

  consultantName: {
    fontSize: "17px",
    fontWeight: 900,
    color: "#0f172a",
  },

  consultantSubCount: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#64748b",
  },

  sectionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 900,
    fontSize: "13px",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  blueDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#2563eb",
    display: "inline-block",
  },

  orangeDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#ea580c",
    display: "inline-block",
  },

  emptyBox: {
    border: "1px dashed #c8d6ee",
    background: "#f8fbff",
    color: "#94a3b8",
    borderRadius: "12px",
    padding: "12px",
    textAlign: "center",
    fontWeight: 700,
    fontSize: "12px",
  },

  emptyBoxOrange: {
    border: "1px dashed #f5c18f",
    background: "#fffaf5",
    color: "#94a3b8",
    borderRadius: "12px",
    padding: "12px",
    textAlign: "center",
    fontWeight: 700,
    fontSize: "12px",
  },

  itemBox: {
    border: "1px solid #d9e3f0",
    borderRadius: "12px",
    padding: "10px 12px",
    background: "#ffffff",
  },

  significantBox: {
    border: "1px solid #f4c18e",
    background: "#fff8f1",
    borderRadius: "12px",
    padding: "10px 12px",
  },

  itemTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },

  itemFacility: {
    fontWeight: 900,
    fontSize: "14px",
    color: "#0f172a",
    lineHeight: 1.3,
  },

  itemDate: {
    fontWeight: 800,
    fontSize: "13px",
    color: "#334155",
    whiteSpace: "nowrap",
  },

  itemDateSlash: {
    fontWeight: 800,
    fontSize: "13px",
    color: "#334155",
    whiteSpace: "nowrap",
  },

  itemType: {
    fontWeight: 800,
    fontSize: "13px",
    color: "#1e293b",
    marginTop: "4px",
  },

  itemComment: {
    color: "#475569",
    fontStyle: "italic",
    fontSize: "13px",
    marginTop: "4px",
    whiteSpace: "pre-wrap",
  },

  significantText: {
    color: "#9a3412",
    fontWeight: 800,
    fontSize: "13px",
    marginTop: "4px",
    whiteSpace: "pre-wrap",
    lineHeight: 1.4,
  },
};
