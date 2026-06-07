
// Donna Kimura
"BLOSSOM GROVE": "Donna Kimura",
  "BLOSSOM GROVE ALZHEIMERS SPECIAL CARE CENTER": "Donna Kimura",
  "BLOSSOM GROVE ALZHEIMER'S SPECIAL CARE CENTER": "Donna Kimura",
  "BLOSSOM GROVE ALZHEIMERS SPECIAL CARE CENTER ALF": "Donna Kimura",
  "BLOSSOM GROVE ALZHEIMER'S SPECIAL CARE CENTER ALF": "Donna Kimura",
"DEL MAR": "Donna Kimura",
"DEL MAR CONVALESCENT": "Donna Kimura",
  "DEL MAR CONVALESCENT HOSPITAL": "Donna Kimura",
"DEL MAR CONVALESCENT CENTER": "Donna Kimura",

// Brenda Rojas
@@ -101,6 +106,8 @@ const FACILITY_CONSULTANT_MAP = {
"VINELAND POST ACUTE": "Brenda Rojas",
"VINELAND POST-ACUTE": "Brenda Rojas",
"THE MEADOWS ON SUNSET": "Brenda Rojas",
  "THE MEADOWS ON SUNSET POST ACUTE": "Brenda Rojas",
  "THE MEADOWS ON SUNSET POST-ACUTE": "Brenda Rojas",
"SUNSET MANOR": "Brenda Rojas",

// Jinkee Javier
@@ -113,8 +120,10 @@ const FACILITY_CONSULTANT_MAP = {
"EXCELL": "Jinkee Javier",
"EXCEL": "Jinkee Javier",
"EXCEL HEALTHCARE CENTER": "Jinkee Javier",
  "EXCELL HEALTHCARE CENTER": "Jinkee Javier",
"MADERA": "Jinkee Javier",
"MADEIRA": "Jinkee Javier",
  "MADERA CARE CENTER": "Jinkee Javier",
"MADEIRA CARE CENTER": "Jinkee Javier",
"MISSION CARMICHAEL": "Jinkee Javier",
"MISSION CARMICHAEL HEALTHCARE CENTER": "Jinkee Javier",
@@ -136,6 +145,8 @@ const FACILITY_CONSULTANT_MAP = {
"SUNNYSIDE": "Beth Clark",
"SUNNYSIDE CONV HOSPITAL": "Beth Clark",
"SUNNYSIDE CONVALESCENT HOSPITAL": "Beth Clark",
  "SUNSET MANOR CONVALESCENT HOSPITAL": "Beth Clark",
  "SUNSET MANOR CONV HOSP": "Beth Clark",

// Guillermo Vicencio
"ANAHEIM": "Guillermo Vicencio",
@@ -235,6 +246,18 @@ function normalizeFacilityName(value) {
.trim();
}

function normalizePersonName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function consultantExists(name) {
  const normalizedName = normalizePersonName(name);

  return Object.values(DIVISIONS).some((consultants) =>
    consultants.includes(normalizedName)
  );
}

function getConsultantForFacility(facilityName) {
const normalized = normalizeFacilityName(facilityName);

@@ -254,6 +277,16 @@ function getConsultantForFacility(facilityName) {
return "Unassigned";
}

function getConsultantForSignificantEvent(event) {
  const rnc = normalizePersonName(event.rnc);

  if (rnc && consultantExists(rnc)) {
    return rnc;
  }

  return getConsultantForFacility(event.facility);
}

function getDivisionForConsultant(consultantName) {
for (const [division, consultants] of Object.entries(DIVISIONS)) {
if (consultants.includes(consultantName)) {
@@ -448,6 +481,7 @@ function ConsultantAvatar({ consultant, size = 48 }) {

export default function WeeklySummaryByDivision({
weeklySummaryItems = [],
  weeklySignificantEvents = [],
submissions = [],
parsedDocs = {},
getAnswer,
@@ -457,6 +491,7 @@ export default function WeeklySummaryByDivision({
onWeeklyDateRangeChange,
}) {
const weeklyEventCount = weeklySummaryItems.length;
  const significantEventCount = weeklySignificantEvents.length;
const isStandingView = dashboardView === "standing";

const groupedWeeklyItems = useMemo(() => {
@@ -466,7 +501,10 @@ export default function WeeklySummaryByDivision({
groups[division] = {};

consultants.forEach((consultant) => {
        groups[division][consultant] = [];
        groups[division][consultant] = {
          surveyActivity: [],
          significantEvents: [],
        };
});
});

@@ -475,13 +513,33 @@ export default function WeeklySummaryByDivision({
const division = getDivisionForConsultant(consultant);

if (!groups[division]) groups[division] = {};
      if (!groups[division][consultant]) groups[division][consultant] = [];
      if (!groups[division][consultant]) {
        groups[division][consultant] = {
          surveyActivity: [],
          significantEvents: [],
        };
      }

      groups[division][consultant].surveyActivity.push(item);
    });

    weeklySignificantEvents.forEach((item) => {
      const consultant = getConsultantForSignificantEvent(item);
      const division = getDivisionForConsultant(consultant);

      if (!groups[division]) groups[division] = {};
      if (!groups[division][consultant]) {
        groups[division][consultant] = {
          surveyActivity: [],
          significantEvents: [],
        };
      }

      groups[division][consultant].push(item);
      groups[division][consultant].significantEvents.push(item);
});

return groups;
  }, [weeklySummaryItems]);
  }, [weeklySummaryItems, weeklySignificantEvents]);

const facilityStanding = useMemo(() => {
const consultantMap = {};
@@ -708,7 +766,14 @@ export default function WeeklySummaryByDivision({
<p style={styles.kicker}>Weekly Summary</p>
<span style={styles.eventBubble}>{weeklyEventCount}</span>
<span style={styles.eventBubbleLabel}>
              {weeklyEventCount === 1 ? "event" : "events"}
              {weeklyEventCount === 1 ? "survey event" : "survey events"}
            </span>

            <span style={styles.significantBubble}>{significantEventCount}</span>
            <span style={styles.significantBubbleLabel}>
              {significantEventCount === 1
                ? "significant event"
                : "significant events"}
</span>
</div>

@@ -759,16 +824,21 @@ export default function WeeklySummaryByDivision({
</div>

<div style={styles.weeklyContent}>
        {weeklyEventCount === 0 && (
        {weeklyEventCount === 0 && significantEventCount === 0 && (
<p style={styles.emptyText}>
            No survey activity for the selected date range.
            No survey activity or significant events for the selected date
            range.
</p>
)}

{Object.entries(groupedWeeklyItems).map(([division, consultants]) => {
const divisionStyle = getDivisionStyle(division);
          const divisionEventCount = Object.values(consultants).reduce(
            (total, items) => total + items.length,
          const divisionSurveyCount = Object.values(consultants).reduce(
            (total, item) => total + item.surveyActivity.length,
            0
          );
          const divisionSignificantCount = Object.values(consultants).reduce(
            (total, item) => total + item.significantEvents.length,
0
);

@@ -793,63 +863,124 @@ export default function WeeklySummaryByDivision({
{division}
</h3>
<p style={styles.divisionSubtext}>
                    Survey activity by assigned consultant
                    Survey activity and significant events by assigned consultant
</p>
</div>

                <span
                  style={{
                    ...styles.divisionBadge,
                    background: divisionStyle.badgeBackground,
                    color: divisionStyle.badgeText,
                  }}
                >
                  {divisionEventCount} events
                </span>
              </div>
                <div style={styles.divisionBadgeGroup}>
                  <span
                    style={{
                      ...styles.divisionBadge,
                      background: divisionStyle.badgeBackground,
                      color: divisionStyle.badgeText,
                    }}
                  >
                    {divisionSurveyCount} survey
                  </span>

              <div style={styles.consultantGrid}>
                {Object.entries(consultants).map(([consultant, items]) => (
                  <div
                    key={consultant}
                  <span
style={{
                      ...styles.consultantCard,
                      background: divisionStyle.cardBackground,
                      ...styles.divisionBadge,
                      background: "#fff7ed",
                      color: "#9a3412",
}}
>
                    <div style={styles.consultantHeader}>
                      <ConsultantAvatar consultant={consultant} size={52} />

                      <div style={styles.consultantTextBlock}>
                        <p style={styles.consultantName}>{consultant}</p>
                        <p style={styles.smallMuted}>
                          {items.length} event{items.length === 1 ? "" : "s"}
                        </p>
                    {divisionSignificantCount} significant
                  </span>
                </div>
              </div>

              <div style={styles.consultantGrid}>
                {Object.entries(consultants).map(([consultant, data]) => {
                  const surveyItems = data.surveyActivity || [];
                  const significantItems = data.significantEvents || [];

                  return (
                    <div
                      key={consultant}
                      style={{
                        ...styles.consultantCard,
                        background: divisionStyle.cardBackground,
                      }}
                    >
                      <div style={styles.consultantHeader}>
                        <ConsultantAvatar consultant={consultant} size={52} />

                        <div style={styles.consultantTextBlock}>
                          <p style={styles.consultantName}>{consultant}</p>
                          <p style={styles.smallMuted}>
                            {surveyItems.length} survey ·{" "}
                            {significantItems.length} significant
                          </p>
                        </div>
</div>
                    </div>

                    {items.length === 0 ? (
                      <p style={styles.noConsultantEvents}>
                        No survey activity this period
                      </p>
                    ) : (
                      <div style={styles.eventList}>
                        {items.map((item) => (
                          <div key={item.id} style={styles.weeklyEvent}>
                            <div style={styles.eventTopLine}>
                              <strong>{item.facility}</strong>
                              <span>{item.date}</span>
                            </div>
                            <p style={styles.eventSurveyType}>
                              {item.surveyType}
                            </p>
                            <em>{item.comments || "No comments entered"}</em>
                      <div style={styles.cardSection}>
                        <div style={styles.sectionMiniHeader}>
                          <span style={styles.sectionDotBlue}></span>
                          <h4 style={styles.sectionMiniTitle}>
                            Survey Activity
                          </h4>
                        </div>

                        {surveyItems.length === 0 ? (
                          <p style={styles.noConsultantEvents}>
                            No survey activity this period
                          </p>
                        ) : (
                          <div style={styles.eventList}>
                            {surveyItems.map((item) => (
                              <div key={item.id} style={styles.weeklyEvent}>
                                <div style={styles.eventTopLine}>
                                  <strong>{item.facility}</strong>
                                  <span>{item.date}</span>
                                </div>
                                <p style={styles.eventSurveyType}>
                                  {item.surveyType}
                                </p>
                                <em>
                                  {item.comments || "No comments entered"}
                                </em>
                              </div>
                            ))}
</div>
                        ))}
                        )}
</div>
                    )}
                  </div>
                ))}

                      <div style={styles.cardSection}>
                        <div style={styles.sectionMiniHeader}>
                          <span style={styles.sectionDotOrange}></span>
                          <h4 style={styles.sectionMiniTitle}>
                            Significant Events
                          </h4>
                        </div>

                        {significantItems.length === 0 ? (
                          <p style={styles.noSignificantEvents}>
                            No significant events this period
                          </p>
                        ) : (
                          <div style={styles.eventList}>
                            {significantItems.map((item) => (
                              <div
                                key={item.id}
                                style={styles.significantEvent}
                              >
                                <div style={styles.eventTopLine}>
                                  <strong>{item.facility}</strong>
                                  <span>{item.date}</span>
                                </div>
                                <p style={styles.significantComment}>
                                  {item.comment}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
</div>
</div>
);
@@ -921,6 +1052,31 @@ const styles = {
borderRadius: "999px",
},

  significantBubble: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "42px",
    height: "32px",
    padding: "0 12px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #ea580c, #fb923c)",
    color: "white",
    fontSize: "18px",
    lineHeight: 1,
    fontWeight: "950",
    boxShadow: "0 6px 14px rgba(234,88,12,0.22)",
  },

  significantBubbleLabel: {
    color: "#9a3412",
    fontSize: "13px",
    fontWeight: "900",
    background: "#ffedd5",
    padding: "7px 10px",
    borderRadius: "999px",
  },

title: {
margin: "4px 0 0",
fontSize: "22px",
@@ -1009,6 +1165,13 @@ const styles = {
fontWeight: "750",
},

  divisionBadgeGroup: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

divisionBadge: {
borderRadius: "999px",
padding: "6px 10px",
@@ -1019,7 +1182,7 @@ const styles = {

consultantGrid: {
display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
gap: "10px",
},

@@ -1035,7 +1198,7 @@ const styles = {
display: "flex",
alignItems: "center",
gap: "10px",
    marginBottom: "9px",
    marginBottom: "10px",
textAlign: "left",
},

@@ -1060,6 +1223,43 @@ const styles = {
fontWeight: "850",
},

  cardSection: {
    display: "grid",
    gap: "7px",
    marginTop: "9px",
  },

  sectionMiniHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  sectionMiniTitle: {
    margin: 0,
    fontSize: "12px",
    fontWeight: "950",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  sectionDotBlue: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    background: "#2563eb",
    flexShrink: 0,
  },

  sectionDotOrange: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    background: "#ea580c",
    flexShrink: 0,
  },

noConsultantEvents: {
margin: 0,
color: "#94a3b8",
@@ -1072,6 +1272,18 @@ const styles = {
textAlign: "center",
},

  noSignificantEvents: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "12px",
    fontWeight: "850",
    background: "#fff7ed",
    border: "1px dashed #fed7aa",
    borderRadius: "10px",
    padding: "8px",
    textAlign: "center",
  },

eventList: {
display: "grid",
gap: "6px",
@@ -1088,6 +1300,16 @@ const styles = {
fontSize: "12px",
},

  significantEvent: {
    display: "grid",
    gap: "3px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "10px",
    padding: "8px",
    fontSize: "12px",
  },

eventTopLine: {
display: "flex",
justifyContent: "space-between",
@@ -1102,6 +1324,15 @@ const styles = {
fontSize: "11px",
},

  significantComment: {
    margin: 0,
    color: "#7c2d12",
    fontWeight: "750",
    fontSize: "12px",
    lineHeight: 1.35,
    whiteSpace: "pre-wrap",
  },

standingHeaderRow: {
display: "flex",
justifyContent: "space-between",
