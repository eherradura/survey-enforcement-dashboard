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

export const CONSULTANT_ASSIGNMENTS = {
  "Erick Herradura": [
    "Park Regency Retirement ALF (PRR)",
  ],

  "Beth Clark": [
    "Alcott Rehabilitation Hospital (AL)",
    "College Vista Post Acute (CL)",
    "Country Oaks Care Center (CO)",
    "Pomona Vista Care Center (PV)",
    "Sun Mar Nursing Center (SM)",
  ],

  "Jinkee Javier": [
    "Courtyard Care Center (CCC)",
    "Crescent City Care Center (CCCC)",
    "Diamond Ridge Healthcare Center (DRH)",
    "Excel Healthcare Center (EH)",
    "Excell Healthcare Center (EH)",
    "Madera Care Center (MCC)",
    "Mission Carmichael Healthcare Center (MCH)",
    "Sunset Manor Conv Hosp (SS)",
    "Sunset Manor Convalescent Hospital (SS)",
  ],

  "Guillermo Vicencio": [
    "Anaheim Healthcare Center (AH)",
    "Bonita Hills Post Acute (BH)",
    "French Park Care Center (FP)",
    "Gordon Lane Care Center (GL)",
    "Park Regency Care Center (PK)",
    "Pelican Ridge Post Acute (PRP)",
  ],

  "Brenda Rojas": [
    "Heritage Manor (HM)",
    "Monterey Park Convalescent Hospital (MP)",
    "North Valley Nursing Center (NV)",
    "Pacific Post Acute (PA)",
    "Tarzana Health and Rehabilitation Center (TH)",
    "The Meadows on Sunset Post Acute",
    "The Meadows on Sunset",
    "Vineland Post Acute (VPA)",
  ],

  "Donna Kimura": [
    "Blossom Grove Alzheimer's Special Care Center",
    "Blossom Grove Alzheimers Special Care Center",
    "Del Mar Convalescent Hospital",
  ],

  "Gerly Orona": [
    "Extended Care Hospital of Riverside (EC)",
    "Garden Park Care Center (GP)",
    "Mountain View Post Acute (MV)",
    "Ocean View Post Acute (OV)",
    "Villa Rancho Bernardo Care Center (VRB)",
    "Vista View Post Acute (VV)",
  ],

  "Melissa Acuna": [
    "Citrus Nursing Center (CN)",
    "Community Care and Rehabilitation Center (CCRC)",
    "Menifee Lakes Post Acute (ML)",
    "Mission Care Center (MC)",
    "Trabuco Hills Post Acute (THP)",
    "Victoria Care Center (VC)",
  ],

  "Sammy Balisbis": [
    "Cottage Crest Post Acute (CCP)",
    "Paramount Convalescent Hospital (PC)",
    "Sierra View Care Center (SV)",
    "Sunny Hills Post Acute (SH)",
    "The Grove Post Acute (TG)",
    "Villa Del Sol Post Acute (VDS)",
  ],
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
    .replace(/\balzheimer s\b/g, "alzheimers")
    .replace(/\balzheimer\b/g, "alzheimers")

    // Important fix:
    // Treat Excel and Excell as the same facility.
    .replace(/\bexcell\b/g, "excel")

    .replace(/\bpost acute\b/g, "postacute")
    .replace(/\bpostacute\b/g, "postacute")
    .replace(/\bconv hosp\b/g, "convalescent hospital")
    .replace(/\bconvalescent hosp\b/g, "convalescent hospital")
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
    // Erick
    ["Park Regency Retirement ALF", "Erick Herradura"],
    ["Park Regency Retirement Center", "Erick Herradura"],
    ["PRR", "Erick Herradura"],

    // Beth
    ["Alcott", "Beth Clark"],
    ["Alcott Rehabilitation Hospital", "Beth Clark"],
    ["College Vista", "Beth Clark"],
    ["College Vista Post Acute", "Beth Clark"],
    ["Country Oaks", "Beth Clark"],
    ["Country Oaks Care Center", "Beth Clark"],
    ["Pomona Vista", "Beth Clark"],
    ["Pomona Vista Care Center", "Beth Clark"],
    ["Sun Mar", "Beth Clark"],
    ["Sun Mar Nursing Center", "Beth Clark"],

    // Jinkee
    ["Courtyard", "Jinkee Javier"],
    ["Courtyard Care Center", "Jinkee Javier"],
    ["Crescent City", "Jinkee Javier"],
    ["Crescent City Care Center", "Jinkee Javier"],
    ["CCCC", "Jinkee Javier"],
    ["Diamond Ridge", "Jinkee Javier"],
    ["Diamond Ridge Healthcare Center", "Jinkee Javier"],
    ["Excel", "Jinkee Javier"],
    ["Excell", "Jinkee Javier"],
    ["Excel Healthcare Center", "Jinkee Javier"],
    ["Excell Healthcare Center", "Jinkee Javier"],
    ["Madera", "Jinkee Javier"],
    ["Madera Care Center", "Jinkee Javier"],
    ["Mission Carmichael", "Jinkee Javier"],
    ["Mission Carmichael Healthcare Center", "Jinkee Javier"],
    ["Sunset Manor", "Jinkee Javier"],
    ["Sunset Manor Conv Hosp", "Jinkee Javier"],
    ["Sunset Manor Convalescent Hospital", "Jinkee Javier"],

    // Guillermo
    ["Anaheim", "Guillermo Vicencio"],
    ["Anaheim Healthcare Center", "Guillermo Vicencio"],
    ["Bonita Hills", "Guillermo Vicencio"],
    ["Bonita Hills Post Acute", "Guillermo Vicencio"],
    ["French Park", "Guillermo Vicencio"],
    ["French Park Care Center", "Guillermo Vicencio"],
    ["Gordon Lane", "Guillermo Vicencio"],
    ["Gordon Lane Care Center", "Guillermo Vicencio"],
    ["Park Regency Care", "Guillermo Vicencio"],
    ["Park Regency Care Center", "Guillermo Vicencio"],
    ["Pelican Ridge", "Guillermo Vicencio"],
    ["Pelican Ridge Post Acute", "Guillermo Vicencio"],

    // Brenda
    ["Heritage Manor", "Brenda Rojas"],
    ["Monterey Park", "Brenda Rojas"],
    ["Monterey Park Convalescent Hospital", "Brenda Rojas"],
    ["North Valley", "Brenda Rojas"],
    ["North Valley Nursing Center", "Brenda Rojas"],
    ["Pacific", "Brenda Rojas"],
    ["Pacific Post Acute", "Brenda Rojas"],
    ["Tarzana", "Brenda Rojas"],
    ["Tarzana Health and Rehabilitation Center", "Brenda Rojas"],
    ["The Meadows on Sunset", "Brenda Rojas"],
    ["The Meadows on Sunset Post Acute", "Brenda Rojas"],
    ["Vineland", "Brenda Rojas"],
    ["Vineland Post Acute", "Brenda Rojas"],

    // Donna
    ["Blossom Grove", "Donna Kimura"],
    ["Blossom Grove Alzheimer's Special Care Center", "Donna Kimura"],
    ["Blossom Grove Alzheimers Special Care Center", "Donna Kimura"],
    ["Del Mar", "Donna Kimura"],
    ["Del Mar Convalescent", "Donna Kimura"],
    ["Del Mar Convalescent Hospital", "Donna Kimura"],

    // Gerly
    ["Extended Care", "Gerly Orona"],
    ["Extended Care Hospital of Riverside", "Gerly Orona"],
    ["Garden Park", "Gerly Orona"],
    ["Garden Park Care Center", "Gerly Orona"],
    ["Mountain View", "Gerly Orona"],
    ["Mountain View Post Acute", "Gerly Orona"],
    ["Ocean View", "Gerly Orona"],
    ["Ocean View Post Acute", "Gerly Orona"],
    ["Villa Rancho Bernardo", "Gerly Orona"],
    ["Villa Rancho Bernardo Care Center", "Gerly Orona"],
    ["Vista View", "Gerly Orona"],
    ["Vista View Post Acute", "Gerly Orona"],

    // Melissa
    ["Citrus", "Melissa Acuna"],
    ["Citrus Nursing Center", "Melissa Acuna"],
    ["Community Care", "Melissa Acuna"],
    ["Community Care and Rehabilitation Center", "Melissa Acuna"],
    ["CCRC", "Melissa Acuna"],
    ["Menifee", "Melissa Acuna"],
    ["Menifee Lakes Post Acute", "Melissa Acuna"],
    ["Mission Care", "Melissa Acuna"],
    ["Mission Care Center", "Melissa Acuna"],
    ["Trabuco", "Melissa Acuna"],
    ["Trabuco Hills Post Acute", "Melissa Acuna"],
    ["Victoria", "Melissa Acuna"],
    ["Victoria Care Center", "Melissa Acuna"],

    // Sammy
    ["Cottage Crest", "Sammy Balisbis"],
    ["Cottage Crest Post Acute", "Sammy Balisbis"],
    ["Paramount", "Sammy Balisbis"],
    ["Paramount Convalescent Hospital", "Sammy Balisbis"],
    ["Sierra View", "Sammy Balisbis"],
    ["Sierra View Care Center", "Sammy Balisbis"],
    ["Sunny Hills", "Sammy Balisbis"],
    ["Sunny Hills Post Acute", "Sammy Balisbis"],
    ["The Grove", "Sammy Balisbis"],
    ["The Grove Post Acute", "Sammy Balisbis"],
    ["Villa Del Sol", "Sammy Balisbis"],
    ["Villa Del Sol Post Acute", "Sammy Balisbis"],
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

  const writtenDate = raw.match(
    /^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2}),?\s*(\d{4})?$/i
  );

  if (writtenDate) {
    const month = MONTHS[writtenDate[1].toLowerCase()];
    const day = Number(writtenDate[2]);
    const year = Number(writtenDate[3] || new Date().getFullYear());
    return new Date(year, month - 1, day);
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
