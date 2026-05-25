"use client";

import Image from "next/image";

const DIVISIONS = [
  {
    divisionName: "Erick's Division",
    consultants: ["beth", "jinkee", "guillermo", "brenda"],
  },
  {
    divisionName: "Donna's Division",
    consultants: ["gerly", "melissa", "sammy"],
  },
];

const CONSULTANTS = {
  beth: {
    name: "Beth Clark",
    photo: "/consultants/Beth%20Clark.jpg",
  },
  jinkee: {
    name: "Jinkee Javier",
    photo: "/consultants/Jinkee%20Javier.jpg",
  },
  guillermo: {
    name: "Guillermo Vicencio",
    photo: "/consultants/Guillermo%20Vicencio.jpg",
  },
  brenda: {
    name: "Brenda Rojas",
    photo: "/consultants/Brenda%20Washington.jpg",
  },
  gerly: {
    name: "Gerly Orona",
    photo: "/consultants/Gerly%20Orona.jpg",
  },
  melissa: {
    name: "Melissa Acuna",
    photo: "/consultants/Melissa%20Acuna.jpg",
  },
  sammy: {
    name: "Sammy Balisbis",
    photo: "/consultants/Sammy%20Balisbis.jpg",
  },
};

export const CONSULTANT_ASSIGNMENTS = {
  // Beth
  Alcott: "beth",
  "Country Oaks": "beth",
  "College Vista": "beth",
  "Sunset Manor": "beth",
  "Pomona Vista": "beth",
  "Sun Mar Nursing": "beth",

  // Jinkee
  Courtyard: "jinkee",
  "Crescent City": "jinkee",
  "Diamond Ridge": "jinkee",
  Excell: "jinkee",
  Madera: "jinkee",
  "Mission Carmichael": "jinkee",

  // Guillermo
  Anaheim: "guillermo",
  "Bonita Hills": "guillermo",
  "French Park": "guillermo",
  "Gordon Lane": "guillermo",
  "Park Regency Care": "guillermo",
  "Pelican Ridge": "guillermo",

  // Brenda
  "North Valley": "brenda",
  "Heritage Manor": "brenda",
  Pacific: "brenda",
  "Monterey Park": "brenda",
  Tarzana: "brenda",
  Vineland: "brenda",

  // Gerly
  "Extended Care": "gerly",
  "Garden Park": "gerly",
  "Mountain View": "gerly",
  "Ocean View": "gerly",
  "Villa Rancho Bernardo": "gerly",
  "Vista View": "gerly",

  // Melissa
  Citrus: "melissa",
  CCRC: "melissa",
  Menifee: "melissa",
  Trabuco: "melissa",
  "Victoria Care": "melissa",
  "Mission Care": "melissa",

  // Sammy
  "Villa Del Sol": "sammy",
  "The Grove": "sammy",
  "Sierra View": "sammy",
  "Cottage Crest": "sammy",
  Paramount: "sammy",
  "Sunny Hills": "sammy",
  Edutrack: "sammy",
};

function normalizeFacilityName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/care center/g, "")
    .replace(/healthcare center/g, "")
    .replace(/rehabilitation hospital/g, "")
    .replace(/rehabilitation/g, "")
    .replace(/hospital/g, "")
    .replace(/nursing/g, "")
    .replace(/snf/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function getConsultantKeyForFacility(facilityName) {
  const normalizedFacility = normalizeFacilityName(facilityName);

  for (const [assignedFacility, consultantKey] of Object.entries(
    CONSULTANT_ASSIGNMENTS
  )) {
    const normalizedAssigned = normalizeFacilityName(assignedFacility);

    if (
      normalizedFacility.includes(normalizedAssigned) ||
      normalizedAssigned.includes(normalizedFacility)
    ) {
      return consultantKey;
    }
  }

  return "unassigned";
}

function parseFlexibleDate(value) {
  if (!value || value === "No information available") return null;

  const raw = String(value).trim();

  const mmddyyyy =
    raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/) ||
    raw.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

  if (mmddyyyy) {
    const month = Number(mmddyyyy[1]) - 1;
    const day = Number(mmddyyyy[2]);
    const year = Number(mmddyyyy[3]);
    return new Date(year, month, day);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplayDate(value) {
  const parsed = parseFlexibleDate(value);

  if (!parsed) return value || "No date entered";

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const year = parsed.getFullYear();

  return `${month}-${day}-${year}`;
}

function isWithinLast7Days(value) {
  const date = parseFlexibleDate(value);

  if (!date) return false;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return date >= sevenDaysAgo && date <= today;
}

function groupWeeklyItemsByDivision(items) {
  const grouped = {
    "Erick's Division": {
      beth: [],
      jinkee: [],
      guillermo: [],
      brenda: [],
    },
    "Donna's Division": {
      gerly: [],
      melissa: [],
      sammy: [],
    },
    Unassigned: {
      unassigned: [],
    },
  };

  items.forEach((item) => {
    const consultantKey = getConsultantKeyForFacility(item.facility);

    const division = DIVISIONS.find((divisionItem) =>
      divisionItem.consultants.includes(consultantKey)
    );

    if (!division) {
      grouped.Unassigned.unassigned.push(item);
      return;
    }

    grouped[division.divisionName][consultantKey].push(item);
  });

  return grouped;
}

export default function WeeklySummaryByDivision({ weeklySummaryItems = [] }) {
  const filteredItems = weeklySummaryItems
    .filter((item) => isWithinLast7Days(item.rawDate || item.date))
    .sort((a, b) => {
      const dateA = parseFlexibleDate(a.rawDate || a.date);
      const dateB = parseFlexibleDate(b.rawDate || b.date);

      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    });

  const grouped = groupWeeklyItemsByDivision(filteredItems);

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.kicker}>Weekly Summary</p>
          <h2 style={styles.title}>Past 7 Days</h2>
        </div>
        <div style={styles.countBadge}>{filteredItems.length} events</div>
      </div>

      <div style={styles.divisionGrid}>
        {DIVISIONS.map((division) => (
          <section key={division.divisionName} style={styles.divisionCard}>
            <h3 style={styles.divisionTitle}>{division.divisionName}</h3>

            <div style={styles.consultantGrid}>
              {division.consultants.map((consultantKey) => {
                const consultant = CONSULTANTS[consultantKey];
                const events = grouped[division.divisionName][consultantKey];

                return (
                  <div key={consultantKey} style={styles.consultantCard}>
                    <div style={styles.consultantHeader}>
                      <div style={styles.photoWrap}>
                        <Image
                          src={consultant.photo}
                          alt={consultant.name}
                          width={52}
                          height={52}
                          style={styles.photo}
                        />
                      </div>

                      <div>
                        <div style={styles.consultantName}>
                          {consultant.name}
                        </div>
                        <div style={styles.eventCount}>
                          {events.length} event{events.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>

                    {events.length === 0 ? (
                      <p style={styles.emptyText}>
                        No survey activity entered in the past 7 days.
                      </p>
                    ) : (
                      <div style={styles.eventList}>
                        {events.map((event) => (
                          <div key={event.id} style={styles.eventItem}>
                            <strong>{event.facility}</strong>:{" "}
                            {formatDisplayDate(event.rawDate || event.date)} -{" "}
                            {event.surveyType}.{" "}
                            <span style={styles.comments}>
                              Comments: {event.comments}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderRadius: "16px",
    padding: "12px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.055)",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },

  kicker: {
    margin: 0,
    color: "#64748b",
    fontWeight: "800",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  title: {
    margin: "3px 0 0",
    fontSize: "20px",
    color: "#0f172a",
    letterSpacing: "-0.35px",
  },

  countBadge: {
    background: "#e0f2fe",
    color: "#075985",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },

  divisionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  },

  divisionCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#f8fafc",
    padding: "10px",
  },

  divisionTitle: {
    margin: "0 0 8px",
    fontSize: "15px",
    color: "#0f172a",
  },

  consultantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "8px",
  },

  consultantCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "9px",
  },

  consultantHeader: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "8px",
  },

  photoWrap: {
    width: "52px",
    height: "52px",
    borderRadius: "999px",
    overflow: "hidden",
    border: "2px solid #dbeafe",
    flexShrink: 0,
    background: "#f1f5f9",
  },

  photo: {
    width: "52px",
    height: "52px",
    objectFit: "cover",
  },

  consultantName: {
    fontSize: "14px",
    fontWeight: "900",
    color: "#0f172a",
  },

  eventCount: {
    marginTop: "2px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
  },

  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: 1.35,
  },

  eventList: {
    display: "grid",
    gap: "6px",
  },

  eventItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "7px",
    color: "#334155",
    fontSize: "12px",
    lineHeight: 1.35,
  },

  comments: {
    color: "#64748b",
  },
};
