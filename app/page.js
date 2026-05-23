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
      : submissions.filter(
          (s) => s.answers?.["3"]?.answer === selectedFacility
        );

  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial",
        background: "#f4f7fb",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "40px", marginBottom: "20px" }}>
        Survey Enforcement Dashboard
      </h1>

      <div style={{ marginBottom: "30px" }}>
        <label style={{ fontWeight: "bold", marginRight: "12px" }}>
          Select Facility:
        </label>

        <select
          value={selectedFacility}
          onChange={(e) => setSelectedFacility(e.target.value)}
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            fontSize: "16px",
            minWidth: "320px",
          }}
        >
          {facilities.map((facility) => (
            <option key={facility} value={facility}>
              {facility}
            </option>
          ))}
        </select>
      </div>

      {filteredSubmissions.map((submission) => {
        const answers = submission.answers;

        return (
          <div
            key={submission.id}
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "16px",
              marginBottom: "20px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <h2>{getAnswer(answers, "3")}</h2>

            <p><strong>Survey Type:</strong> {getAnswer(answers, "4")}</p>
            <p><strong>Intake Number:</strong> {getAnswer(answers, "6")}</p>
            <p><strong>Survey Entrance:</strong> {getAnswer(answers, "5")}</p>
            <p><strong>Last Day of Survey:</strong> {getAnswer(answers, "67")}</p>
            <p><strong>DPNA Date:</strong> {getAnswer(answers, "68")}</p>
            <p><strong>Termination Date:</strong> {getAnswer(answers, "69")}</p>
            <p><strong>Completion Date:</strong> {getAnswer(answers, "70")}</p>
            <p><strong>Enforcement Cycle:</strong> {getAnswer(answers, "71")}</p>
            <p><strong>Deficiency:</strong> {getAnswer(answers, "74")}</p>
          </div>
        );
      })}
    </main>
  );
}
