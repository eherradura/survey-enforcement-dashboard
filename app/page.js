"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("All Facilities");

  useEffect(() => {
    async function loadData() {
      const res = await fetch("/api/jotform");
      const data = await res.json();
      setSubmissions(data.content || []);
    }
    loadData();
  }, []);

  function getAnswer(answers, id) {
    const field = answers?.[id];
    if (!field) return "N/A";

    if (field.prettyFormat) return field.prettyFormat;

    if (field.options_array && field.answer) {
      try {
        const options = JSON.parse(field.options_array);
        const selectedKey = String(field.answer).replace("{", "").replace("}", "");
        return options[selectedKey]?.value || field.answer;
      } catch {
        return field.answer;
      }
    }

    return field.answer || "N/A";
  }

  const facilities = useMemo(() => {
    const names = submissions
      .map((s) => s.answers?.["3"]?.answer)
      .filter(Boolean);

    return ["All Facilities", ...Array.from(new Set(names)).sort()];
  }, [submissions]);

  const filteredSubmissions =
    selectedFacility === "All Facilities"
      ? submissions
      : submissions.filter((s) => s.answers?.["3"]?.answer === selectedFacility);

  const openCycles = filteredSubmissions.filter(
    (s) => getAnswer(s.answers, "71").toLowerCase().includes("open")
  ).length;

  const withDeficiencies = filteredSubmissions.filter(
    (s) => getAnswer(s.answers, "74").toLowerCase().includes("yes")
  ).length;

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.kicker}>Survey Intelligence</p>
          <h1 style={styles.title}>Enforcement Cycle Dashboard</h1>
          <p style={styles.subtitle}>
            Track survey activity, open cycles, DPNA risk, termination dates, and deficiencies from Jotform.
          </p>
        </div>
      </section>

      <section style={styles.controls}>
        <div>
          <label style={styles.label}>Select Facility</label>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            style={styles.select}
          >
            {facilities.map((facility) => (
              <option key={facility} value={facility}>
                {facility}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Survey Records</p>
          <h2 style={styles.statNumber}>{filteredSubmissions.length}</h2>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Open Cycles</p>
          <h2 style={styles.statNumber}>{openCycles}</h2>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>With Deficiencies</p>
          <h2 style={styles.statNumber}>{withDeficiencies}</h2>
        </div>
      </section>

      <section>
        {filteredSubmissions.map((submission) => {
          const answers = submission.answers;
          const cycle = getAnswer(answers, "71");
          const deficiency = getAnswer(answers, "74");

          return (
            <article key={submission.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.facility}>{getAnswer(answers, "3")}</h2>
                  <p style={styles.meta}>
                    {getAnswer(answers, "4")} • Intake {getAnswer(answers, "6")}
                  </p>
                </div>

                <div style={styles.badgeWrap}>
                  <span style={cycle.toLowerCase().includes("open") ? styles.badgeRed : styles.badgeGreen}>
                    {cycle}
                  </span>
                  <span style={deficiency.toLowerCase().includes("yes") ? styles.badgeAmber : styles.badgeBlue}>
                    Deficiency: {deficiency}
                  </span>
                </div>
              </div>

              <div style={styles.timeline}>
                <div style={styles.timelineItem}>
                  <span style={styles.dot}></span>
                  <p style={styles.timeLabel}>Entrance</p>
                  <strong>{getAnswer(answers, "5")}</strong>
                </div>

                <div style={styles.line}></div>

                <div style={styles.timelineItem}>
                  <span style={styles.dot}></span>
                  <p style={styles.timeLabel}>Last Day</p>
                  <strong>{getAnswer(answers, "67")}</strong>
                </div>

                <div style={styles.line}></div>

                <div style={styles.timelineItem}>
                  <span style={styles.dotDanger}></span>
                  <p style={styles.timeLabel}>DPNA</p>
                  <strong>{getAnswer(answers, "68")}</strong>
                </div>

                <div style={styles.line}></div>

                <div style={styles.timelineItem}>
                  <span style={styles.dotDark}></span>
                  <p style={styles.timeLabel}>Termination</p>
                  <strong>{getAnswer(answers, "69")}</strong>
                </div>
              </div>

              <div style={styles.details}>
                <p><strong>Completion Date:</strong> {getAnswer(answers, "70")}</p>
                <p><strong>Comments:</strong> {getAnswer(answers, "10")}</p>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef4ff 0%, #f8fafc 45%, #ffffff 100%)",
    padding: "40px",
    fontFamily: "Arial, sans-serif",
    color: "#102033",
  },
  hero: {
    background: "linear-gradient(135deg, #0f2a4a, #174f7a)",
    color: "white",
    padding: "36px",
    borderRadius: "28px",
    marginBottom: "24px",
    boxShadow: "0 18px 40px rgba(15, 42, 74, 0.25)",
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: "2px",
    fontSize: "12px",
    opacity: 0.8,
    margin: 0,
  },
  title: {
    fontSize: "44px",
    margin: "8px 0",
  },
  subtitle: {
    maxWidth: "760px",
    fontSize: "17px",
    lineHeight: 1.5,
    opacity: 0.9,
  },
  controls: {
    background: "white",
    padding: "22px",
    borderRadius: "20px",
    marginBottom: "20px",
    boxShadow: "0 8px 24px rgba(15, 42, 74, 0.08)",
  },
  label: {
    display: "block",
    fontWeight: "700",
    marginBottom: "8px",
  },
  select: {
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    minWidth: "340px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  statCard: {
    background: "white",
    padding: "22px",
    borderRadius: "20px",
    boxShadow: "0 8px 24px rgba(15, 42, 74, 0.08)",
  },
  statLabel: {
    margin: 0,
    color: "#64748b",
    fontWeight: "700",
  },
  statNumber: {
    fontSize: "38px",
    margin: "8px 0 0",
  },
  card: {
    background: "white",
    padding: "26px",
    borderRadius: "24px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(15, 42, 74, 0.09)",
    border: "1px solid #e5e7eb",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
  },
  facility: {
    margin: 0,
    fontSize: "24px",
  },
  meta: {
    color: "#64748b",
    marginTop: "6px",
  },
  badgeWrap: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  badgeRed: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "700",
  },
  badgeGreen: {
    background: "#dcfce7",
    color: "#166534",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "700",
  },
  badgeAmber: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "700",
  },
  badgeBlue: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "700",
  },
  timeline: {
    display: "grid",
    gridTemplateColumns: "1fr 60px 1fr 60px 1fr 60px 1fr",
    alignItems: "center",
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "18px",
    marginBottom: "18px",
  },
  timelineItem: {
    textAlign: "center",
  },
  dot: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "#2563eb",
  },
  dotDanger: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "#dc2626",
  },
  dotDark: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "#111827",
  },
  line: {
    height: "3px",
    background: "#cbd5e1",
  },
  timeLabel: {
    margin: "6px 0",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "700",
  },
  details: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "16px",
    color: "#334155",
  },
};
