"use client";
import Link from "next/link";
import { useState } from "react";

// Reuse the same helpers and constants from WeeklySummaryByDivision
// (copy these from your other file or import if you refactor later)
const CURRENT_YEAR = new Date().getFullYear();

const FACILITY_CONSULTANT_MAP = {
  // ... (paste your full FACILITY_CONSULTANT_MAP from the other file here)
  // For brevity I'm omitting it - copy it from WeeklySummaryByDivision.jsx
};

const normalizeFacilityName = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export default function MissingDonReports() {
  const [dateRange, setDateRange] = useState({
    start: "2026-06-01",
    end: "2026-06-07",
  });

  // Mock missing facilities for now - replace with real JotForm logic later
  const missingFacilities = [
    { facility: "Crescent City Care Center (CCCC)", consultant: "Jinkee Javier", reason: "No DON weekly report submitted" },
    { facility: "Victoria Care Center", consultant: "Melissa Acuna", reason: "No DON weekly report submitted" },
    { facility: "Garden Park Care Center", consultant: "Gerly Orona", reason: "No DON weekly report submitted" },
  ];

  return (
    <div style={{ padding: "20px", fontFamily: "Inter, system-ui, sans-serif", background: "#f4f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <Link href="/" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "700" }}>
          ← Back to Survey Dashboard
        </Link>

        <h1 style={{ fontSize: "32px", margin: "20px 0 10px", letterSpacing: "-0.8px" }}>
          Missing DON Weekly Reports
        </h1>
        <p style={{ color: "#64748b", marginBottom: "24px" }}>
          Facilities without a DON weekly report submitted for the selected period
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", alignItems: "center" }}>
          <label>
            From
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={{ marginLeft: "8px", padding: "6px 10px", borderRadius: "8px", border: "1px solid #bfdbfe" }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={{ marginLeft: "8px", padding: "6px 10px", borderRadius: "8px", border: "1px solid #bfdbfe" }}
            />
          </label>
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 8px 20px rgba(15,23,42,0.055)" }}>
          {missingFacilities.length === 0 ? (
            <p style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              All facilities have submitted their DON weekly reports for this period.
            </p>
          ) : (
            missingFacilities.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  borderBottom: index < missingFacilities.length - 1 ? "1px solid #e2e8f0" : "none",
                }}
              >
                <div>
                  <strong style={{ fontSize: "17px" }}>{item.facility}</strong>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                    {item.consultant}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "4px 12px", borderRadius: "9999px", fontSize: "13px", fontWeight: "700" }}>
                    {item.reason}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "30px", color: "#64748b", fontSize: "13px" }}>
          Data pulled from JotForm • Last updated just now
        </p>
      </div>
    </div>
  );
}
