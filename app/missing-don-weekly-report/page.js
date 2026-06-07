"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CONSULTANT_ASSIGNMENTS,
  CONSULTANT_PHOTOS,
  DIVISIONS,
  defaultFromDate,
  defaultToDate,
  formatDisplayDate,
  getConsultantByFacility,
  getDivisionByConsultant,
  getSignificantFacilityName,
  getSignificantSubmittedDate,
  isDateWithinRange,
  parseAnyDate,
} from "../../app/lib/dashboardAssignments";

export default function MissingDonWeeklyReportPage() {
  const searchParams = useSearchParams();
  const fromDate = searchParams.get("from") || defaultFromDate();
  const toDate = searchParams.get("to") || defaultToDate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/rnc-comments", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || data?.success === false) {
          throw new Error(data?.error || "Unable to load DON weekly report data.");
        }

        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        if (active) {
          setRows(items);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load DON weekly report data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const submittedFacilitySet = useMemo(() => {
    const set = new Set();

    rows.forEach((row) => {
      const facilityName = getSignificantFacilityName(row);
      const dateValue =
        row?.date ||
        row?.submissionDate ||
        row?.submittedAt ||
        getSignificantSubmittedDate(row);

      if (!facilityName) return;
      if (!dateValue) return;

      if (isDateWithinRange(dateValue, fromDate, toDate)) {
        set.add(facilityName);
      }
    });

    return set;
  }, [rows, fromDate, toDate]);

  const groupedMissing = useMemo(() => {
    return DIVISIONS.map((division) => {
      const consultants = division.consultants.map((consultant) => {
        const facilities = CONSULTANT_ASSIGNMENTS[consultant] || [];

        const missingFacilities = facilities.filter((facility) => {
          const exactSubmitted = [...submittedFacilitySet].some(
            (submittedFacility) =>
              getConsultantByFacility(submittedFacility) === consultant &&
              normalizeLikeFacility(submittedFacility) === normalizeLikeFacility(facility)
          );

          return !exactSubmitted;
        });

        return {
          consultant,
          missingFacilities,
        };
      });

      return {
        ...division,
        consultants,
      };
    });
  }, [submittedFacilitySet]);

  const totalMissing = groupedMissing.reduce((sum, division) => {
    return (
      sum +
      division.consultants.reduce(
        (sub, consultant) => sub + consultant.missingFacilities.length,
        0
      )
    );
  }, 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Missing DON Weekly Report</div>
          <h1 style={styles.title}>Facilities Missing DON Weekly Report</h1>
          <div style={styles.subTitle}>
            Date Range: {formatDisplayDate(fromDate)} to {formatDisplayDate(toDate)}
          </div>
        </div>

        <div style={styles.headerActions}>
          <div style={styles.countPill}>{totalMissing} Missing</div>
          <Link href="/" style={styles.backButton}>
            Back To Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={styles.messageBox}>Loading DON weekly report submissions...</div>
      ) : error ? (
        <div style={styles.errorBox}>{error}</div>
      ) : (
        groupedMissing.map((division) => (
          <section
            key={division.name}
            style={{
              ...styles.divisionSection,
              borderColor: division.accent,
              background: division.bg,
            }}
          >
            <div style={styles.divisionTitle}>{division.title}</div>

            <div style={styles.consultantGrid}>
              {division.consultants.map((consultant) => (
                <div key={consultant.consultant} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <img
                      src={
                        CONSULTANT_PHOTOS[consultant.consultant] ||
                        "/consultants/.gitkeep"
                      }
                      alt={consultant.consultant}
                      style={styles.photo}
                    />
                    <div style={styles.consultantName}>{consultant.consultant}</div>
                    <div style={styles.missingPill}>
                      {consultant.missingFacilities.length} Missing
                    </div>
                  </div>

                  {consultant.missingFacilities.length === 0 ? (
                    <div style={styles.goodBox}>No Missing DON Weekly Report In This Date Range</div>
                  ) : (
                    <div style={styles.facilityList}>
                      {consultant.missingFacilities.map((facility) => (
                        <div key={facility} style={styles.facilityRow}>
                          {facility}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function normalizeLikeFacility(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const styles = {
  page: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    flexWrap: "wrap",
  },

  eyebrow: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  title: {
    margin: "4px 0",
    fontSize: "32px",
    fontWeight: 900,
    color: "#0f172a",
  },

  subTitle: {
    fontSize: "14px",
    color: "#475569",
    fontWeight: 700,
  },

  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  countPill: {
    background: "#ffedd5",
    color: "#c2410c",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 900,
  },

  backButton: {
    textDecoration: "none",
    background: "#f8fbff",
    border: "1px solid #bfd0ea",
    color: "#1d4ed8",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 900,
  },

  messageBox: {
    background: "#f8fbff",
    border: "1px solid #d9e3f0",
    borderRadius: "14px",
    padding: "18px",
    fontWeight: 700,
    color: "#475569",
  },

  errorBox: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: "14px",
    padding: "18px",
    fontWeight: 700,
    color: "#be123c",
  },

  divisionSection: {
    border: "2px solid",
    borderRadius: "18px",
    padding: "16px",
  },

  divisionTitle: {
    fontSize: "24px",
    fontWeight: 900,
    marginBottom: "14px",
    color: "#0f172a",
  },

  consultantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "14px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #d9e3f0",
    borderRadius: "16px",
    padding: "14px",
  },

  cardHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "8px",
    marginBottom: "12px",
  },

  photo: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#e2e8f0",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.15)",
  },

  consultantName: {
    fontSize: "17px",
    fontWeight: 900,
    color: "#0f172a",
  },

  missingPill: {
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "999px",
    padding: "6px 10px",
    fontWeight: 900,
    fontSize: "12px",
  },

  goodBox: {
    border: "1px dashed #a7f3d0",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: "12px",
    padding: "12px",
    textAlign: "center",
    fontWeight: 800,
    fontSize: "12px",
  },

  facilityList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  facilityRow: {
    border: "1px solid #f1d7bf",
    background: "#fff8f1",
    borderRadius: "12px",
    padding: "10px 12px",
    color: "#9a3412",
    fontWeight: 800,
    fontSize: "13px",
  },
};
