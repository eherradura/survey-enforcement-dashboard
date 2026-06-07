export const DIVISIONS = [
  {
    name: "Erick Herradura",
    title: "Erick Herradura's Division",
    accent: "#2f6fed",
    bg: "#f3f7ff",
    consultants: [
      "Erick Herradura",
      "Beth Clark",
      "Jinkee Javier",
      "Guillermo Vicencio",
      "Brenda Rojas",
    ],
  },
  {
    name: "Donna Kimura",
    title: "Donna Kimura's Division",
    accent: "#1fa15a",
    bg: "#f3fbf6",
    consultants: [
      "Donna Kimura",
      "Gerly Orona",
      "Melissa Acuna",
      "Sammy Balisbis",
    ],
  },
];

export const CONSULTANT_PHOTOS = {
  "Erick Herradura": "/consultants/Erick Herradura.jpg",
  "Donna Kimura": "/consultants/Donna Kimura.jpg",
  "Beth Clark": "/consultants/Beth Clark.jpg",
  "Brenda Rojas": "/consultants/Brenda Washington.jpg",
  "Jinkee Javier": "/consultants/Jinkee Javier.jpg",
  "Guillermo Vicencio": "/consultants/Guillermo Vicencio.jpg",
  "Gerly Orona": "/consultants/Gerly Orona.jpg",
  "Melissa Acuna": "/consultants/Melissa Acuna.jpg",
  "Sammy Balisbis": "/consultants/Sammy Balisbis.jpg",
};

/*
  IMPORTANT:
  This list intentionally includes ONLY confirmed assignments from your dashboard
  screenshots/conversation history.

  If a facility is not listed here, it will not be counted as missing on the
  Missing DON Weekly Report page. That prevents false missing-report alerts.
*/

export const CONSULTANT_ASSIGNMENTS = {
  "Erick Herradura": [
    "Park Regency Retirement ALF (PRR)",
  ],

  "Beth Clark": [
    "Country Oaks Care Center (CO)",
    "Pomona Vista Care Center (PV)",
  ],

  "Jinkee Javier": [
    "Mission Carmichael Healthcare Center (MCH)",
    "Crescent City Care Center (CCCC)",
  ],

  "Guillermo Vicencio": [
    "Gordon Lane Care Center (GL)",
    "Anaheim Healthcare Center (AH)",
    "French Park Care Center (FP)",
  ],

  "Brenda Rojas": [
    "Tarzana Health and Rehabilitation Center (TH)",
    "North Valley Nursing Center (NV)",
    "The Meadows on Sunset",
  ],

  "Donna Kimura": [],

  "Gerly Orona": [
    "Vista View Post Acute (VV)",
    "Villa Rancho Bernardo Care Center (VRB)",
  ],

  "Melissa Acuna": [
    "Trabuco Hills Post Acute (THP)",
    "Mission Care Center (MC)",
    "Community Care and Rehabilitation Center (CCRC)",
    "Menifee Lakes Post Acute (ML)",
    "Victoria Care Center (VC)",
  ],

  "Sammy Balisbis": [],
};

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeFacilityName(value) {
  return normalizeText(value)
    .replace(/\bpost acute\b/g, "postacute")
    .replace(/\bpost acute\b/g, "postacute")
    .replace(/\bhealth and rehabilitation\b/g, "health rehabilitation")
    .replace(/\bcare and rehabilitation\b/g, "care rehabilitation")
    .replace(/\s+/g, " ")
    .trim();
}

const FACILITY_TO_CONSULTANT = (() => {
  const map = new Map();

  Object.entries(CONSULTANT_ASSIGNMENTS).forEach(([consultant, facilities]) => {
    facilities.forEach((facility) => {
      map.set(normalizeFacilityName(facility), consultant);
    });
  });

  const aliasPairs = [
    ["Park Regency Retirement ALF", "Erick Herradura"],
    ["Park Regency Retirement Center", "Erick Herradura"],
    ["PRR", "Erick Herradura"],

    ["Country Oaks", "Beth Clark"],
    ["Country Oaks Care Center", "Beth Clark"],
    ["Pomona Vista", "Beth Clark"],
    ["Pomona Vista Care Center", "Beth Clark"],

    ["Mission Carmichael", "Jinkee Javier"],
    ["Mission Carmichael Healthcare Center", "Jinkee Javier"],
    ["Crescent City", "Jinkee Javier"],
    ["Crescent City Care Center", "Jinkee Javier"],

    ["Gordon Lane", "Guillermo Vicencio"],
    ["Gordon Lane Care Center", "Guillermo Vicencio"],
    ["Anaheim", "Guillermo Vicencio"],
    ["Anaheim Healthcare Center", "Guillermo Vicencio"],
    ["French Park", "Guillermo Vicencio"],
    ["French Park Care Center", "Guillermo Vicencio"],

    ["Tarzana", "Brenda Rojas"],
    ["Tarzana Health and Rehabilitation Center", "Brenda Rojas"],
    ["North Valley", "Brenda Rojas"],
    ["North Valley Nursing Center", "Brenda Rojas"],
    ["The Meadows on Sunset", "Brenda Rojas"],

    ["Vista View", "Gerly Orona"],
    ["Vista View Post Acute", "Gerly Orona"],
    ["Villa Rancho Bernardo", "Gerly Orona"],
    ["Villa Rancho Bernardo Care Center", "Gerly Orona"],

    ["Trabuco", "Melissa Acuna"],
    ["Trabuco Hills Post Acute", "Melissa Acuna"],
    ["Mission Care", "Melissa Acuna"],
    ["Mission Care Center", "Melissa Acuna"],
    ["Community Care and Rehabilitation Center", "Melissa Acuna"],
    ["CCRC", "Melissa Acuna"],
    ["Menifee", "Melissa Acuna"],
    ["Menifee Lakes Post Acute", "Melissa Acuna"],
    ["Victoria", "Melissa Acuna"],
    ["Victoria Care Center", "Melissa Acuna"],
  ];

  aliasPairs.forEach(([facility, consultant]) => {
    map.set(normalizeFacilityName(facility), consultant);
  });

  return map;
})();

export function getConsultantByFacility(facilityName) {
  const normalized = normalizeFacilityName(facilityName);
  if (!normalized) return "Unassigned";

  if (FACILITY_TO_CONSULTANT.has(normalized)) {
    return FACILITY_TO_CONSULTANT.get(normalized);
  }

  for (const [knownFacility, consultant] of FACILITY_TO_CONSULTANT.entries()) {
    if (
      normalized.includes(knownFacility) ||
      knownFacility.includes(normalized)
    ) {
      return consultant;
    }
  }

  return "Unassigned";
}

export function getDivisionByConsultant(consultantName) {
  return (
    DIVISIONS.find((division) =>
      division.consultants.includes(consultantName)
    ) || null
  );
}

export function getAllAssignedFacilities() {
  return Object.values(CONSULTANT_ASSIGNMENTS).flat();
}

export function formatDateInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateLike, separator = "/") {
  const d = parseAnyDate(dateLike);
  if (!d) return "No information available";

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}${separator}${dd}${separator}${yyyy}`;
}

export function defaultFromDate() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6);
  return formatDateInput(from);
}

export function defaultToDate() {
  return formatDateInput(new Date());
}

export function parseAnyDate(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const slashOrDash = raw.match(
    /^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/
  );

  if (slashOrDash) {
    let [, mm, dd, yyyy] = slashOrDash;
    let year = Number(yyyy || new Date().getFullYear());
    if (String(year).length === 2) year += 2000;
    return new Date(year, Number(mm) - 1, Number(dd));
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
}

export function isDateWithinRange(dateValue, fromValue, toValue) {
  const date = parseAnyDate(dateValue);
  const from = parseAnyDate(fromValue);
  const to = parseAnyDate(toValue);

  if (!date || !from || !to) return false;
  return date >= from && date <= to;
}

export function hasMeaningfulText(value) {
  const text = String(value || "").trim();
  if (!text) return false;

  const normalized = text.toLowerCase().trim();

  return ![
    "none",
    "n/a",
    "na",
    "no",
    "no issues",
    "nothing",
    "-",
  ].includes(normalized);
}

export function stripMrn(text) {
  return String(text || "")
    .replace(/\bMRN\s*#?\s*\d+\b/gi, "")
    .replace(/\bmedical record number\s*#?\s*\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const MONTHS = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

export function extractEventDateAndText(rawText, fallbackDate) {
  const original = String(rawText || "").trim();
  const fallback = parseAnyDate(fallbackDate) || new Date();

  if (!original) {
    return {
      eventDate: fallback,
      displayDate: formatDisplayDate(fallback),
      cleanedText: "",
    };
  }

  const lines = original
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const firstLine = lines[0] || original;

  // Example: 5/27 Resident fell.
  // Example: 5/27/26 Resident fell.
  let match = firstLine.match(
    /^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\s*(.*)$/i
  );

  if (match) {
    let [, mm, dd, yyyy, remainder] = match;
    let year = Number(yyyy || fallback.getFullYear());
    if (String(year).length === 2) year += 2000;

    const eventDate = new Date(year, Number(mm) - 1, Number(dd));

    const restLines = [...lines];
    restLines[0] = remainder.trim();
    const cleanedText = stripMrn(restLines.join("\n")).trim();

    return {
      eventDate,
      displayDate: formatDisplayDate(eventDate),
      cleanedText,
    };
  }

  // Example: June 1 - resident to resident altercation.
  match = firstLine.match(
    /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{2,4}))?\s*[-:]\s*(.*)$/i
  );

  if (match) {
    let [, monthWord, dd, yyyy, remainder] = match;
    const month = MONTHS[String(monthWord).toLowerCase()];

    if (month) {
      let year = Number(yyyy || fallback.getFullYear());
      if (String(year).length === 2) year += 2000;

      const eventDate = new Date(year, month - 1, Number(dd));
      const restLines = [...lines];
      restLines[0] = remainder.trim();
      const cleanedText = stripMrn(restLines.join("\n")).trim();

      return {
        eventDate,
        displayDate: formatDisplayDate(eventDate),
        cleanedText,
      };
    }
  }

  return {
    eventDate: fallback,
    displayDate: formatDisplayDate(fallback),
    cleanedText: stripMrn(original),
  };
}

export function getSurveyFacilityName(item) {
  return (
    item?.facilityName ||
    item?.facility ||
    item?.facility_name ||
    item?.facilityLabel ||
    item?.name ||
    ""
  );
}

export function getSurveyComments(item) {
  return (
    item?.comments ||
    item?.comment ||
    item?.notes ||
    item?.surveyComments ||
    ""
  );
}

export function getSurveyType(item) {
  return (
    item?.surveyType ||
    item?.type ||
    item?.eventType ||
    item?.category ||
    "No information available"
  );
}

export function getSurveyDate(item) {
  return (
    item?.rawDate ||
    item?.surveyEntrance ||
    item?.entranceDate ||
    item?.date ||
    item?.lastDayOfSurvey ||
    item?.submissionDate ||
    null
  );
}

export function getSignificantFacilityName(item) {
  return (
    item?.facilityName ||
    item?.facility ||
    item?.facility_name ||
    item?.facilityLabel ||
    ""
  );
}

export function getSignificantCommentText(item) {
  return (
    item?.displayComment ||
    item?.significantEventComment ||
    item?.significantEvent ||
    item?.reportableSignificantEvent ||
    item?.reportableEventComment ||
    item?.comment ||
    item?.comments ||
    item?.typeA39 ||
    ""
  );
}

export function getSignificantSubmittedDate(item) {
  return (
    item?.displayDate ||
    item?.eventDateFromComment ||
    item?.submissionDate ||
    item?.submittedAt ||
    item?.date ||
    item?.reportDate ||
    item?.rawDate ||
    null
  );
}
