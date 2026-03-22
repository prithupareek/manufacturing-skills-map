#!/usr/bin/env node
/**
 * generate-mock-data.js
 *
 * Fetches the US counties TopoJSON, extracts every county FIPS code and name,
 * then produces two deterministic mock-data files:
 *   data/numeracy.json   - per-county numeracy rates keyed by FIPS
 *   data/demand.json     - 25 manufacturing-demand cities
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Seeded PRNG  (mulberry32)
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

/** Return a random float in [lo, hi) */
function randRange(lo, hi) {
  return lo + rng() * (hi - lo);
}

/** Return a random float in [lo, hi) rounded to 1 decimal */
function randRate(lo, hi) {
  return Math.round(randRange(lo, hi) * 10) / 10;
}

// ---------------------------------------------------------------------------
// State FIPS -> abbreviation mapping (all 50 states + DC + territories)
// ---------------------------------------------------------------------------
const STATE_FIPS_TO_ABBR = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY", "60": "AS", "66": "GU", "69": "MP", "72": "PR",
  "78": "VI",
};

// ---------------------------------------------------------------------------
// Regional buckets for realistic rate distribution
// ---------------------------------------------------------------------------
const LOW_STATES = new Set(["AL", "MS", "LA", "AR", "WV", "KY", "TN", "SC"]);
const HIGH_STATES = new Set(["CT", "MA", "NJ", "NY", "MD", "VA", "CA", "WA", "OR"]);

function rateForState(stateAbbr) {
  if (LOW_STATES.has(stateAbbr)) {
    // Mostly 15-40, with some overlap up to 50
    return randRate(15, 42);
  }
  if (HIGH_STATES.has(stateAbbr)) {
    // Mostly 75-95
    return randRate(75, 95);
  }
  // Baseline: 50-75
  return randRate(50, 75);
}

// ---------------------------------------------------------------------------
// Demand cities
// ---------------------------------------------------------------------------
const CITIES = [
  { name: "Detroit MI",       lat: 42.3314, lng: -83.0458 },
  { name: "Houston TX",       lat: 29.7604, lng: -95.3698 },
  { name: "Cleveland OH",     lat: 41.4993, lng: -81.6944 },
  { name: "Milwaukee WI",     lat: 43.0389, lng: -87.9065 },
  { name: "Charlotte NC",     lat: 35.2271, lng: -80.8431 },
  { name: "Birmingham AL",    lat: 33.5186, lng: -86.8104 },
  { name: "Memphis TN",       lat: 35.1495, lng: -90.0490 },
  { name: "Louisville KY",    lat: 38.2527, lng: -85.7585 },
  { name: "Greenville SC",    lat: 34.8526, lng: -82.3940 },
  { name: "Baton Rouge LA",   lat: 30.4515, lng: -91.1871 },
  { name: "Jackson MS",       lat: 32.2988, lng: -90.1848 },
  { name: "Huntsville AL",    lat: 34.7304, lng: -86.5861 },
  { name: "Chattanooga TN",   lat: 35.0456, lng: -85.3097 },
  { name: "Tupelo MS",        lat: 34.2576, lng: -88.7034 },
  { name: "Shreveport LA",    lat: 32.5252, lng: -93.7502 },
  { name: "Toledo OH",        lat: 41.6528, lng: -83.5379 },
  { name: "Gary IN",          lat: 41.5934, lng: -87.3464 },
  { name: "Flint MI",         lat: 43.0125, lng: -83.6875 },
  { name: "Youngstown OH",    lat: 41.0998, lng: -80.6495 },
  { name: "Canton OH",        lat: 40.7990, lng: -81.3784 },
  { name: "Spartanburg SC",   lat: 34.9496, lng: -81.9320 },
  { name: "Decatur AL",       lat: 34.6059, lng: -86.9833 },
  { name: "Pine Bluff AR",    lat: 34.2284, lng: -92.0032 },
  { name: "Gadsden AL",       lat: 34.0143, lng: -86.0066 },
  { name: "Beaumont TX",      lat: 30.0802, lng: -94.1266 },
];

// States whose cities get HIGH demand (the low-numeracy states)
const HIGH_DEMAND_STATES = new Set(["AL", "MS", "LA", "AR", "SC", "KY", "TN"]);

const DESCRIPTIONS = {
  "Detroit MI":      "Major auto-manufacturing hub facing acute CNC operator shortages.",
  "Houston TX":      "Petrochemical corridor needs welders and industrial electricians.",
  "Cleveland OH":    "Legacy steel and polymer plants ramping up reshoring production.",
  "Milwaukee WI":    "Precision tooling and brewing equipment firms expanding capacity.",
  "Charlotte NC":    "Growing advanced-manufacturing cluster for aerospace components.",
  "Birmingham AL":   "Foundry and metal-fabrication sector struggling to fill entry-level roles.",
  "Memphis TN":      "Distribution-manufacturing crossover zone with high forklift cert demand.",
  "Louisville KY":   "Appliance and automotive parts plants facing skilled-labor gap.",
  "Greenville SC":   "BMW and tire manufacturers report persistent technician vacancies.",
  "Baton Rouge LA":  "Chemical processing plants need instrumentation and controls technicians.",
  "Jackson MS":      "Light manufacturing expansion hampered by low workforce numeracy.",
  "Huntsville AL":   "Defense and aerospace contractors competing for precision machinists.",
  "Chattanooga TN":  "Volkswagen and supplier plants experiencing quality-technician shortfalls.",
  "Tupelo MS":       "Furniture and upholstery manufacturers can't find qualified applicants.",
  "Shreveport LA":   "Oil-field equipment shops need CNC programmers and welders.",
  "Toledo OH":       "Glass and auto-parts corridor with growing robotics-tech demand.",
  "Gary IN":         "Steel mills modernizing but lacking automation-literate workers.",
  "Flint MI":        "Post-auto-industry transition creates demand for multi-skill technicians.",
  "Youngstown OH":   "Additive-manufacturing startups need workers with strong math skills.",
  "Canton OH":       "Specialty steel and bearings producers expanding second shifts.",
  "Spartanburg SC":  "BMW plant expansion drives unprecedented demand for skilled labor.",
  "Decatur AL":      "Chemical and aerospace plants competing for a thin talent pool.",
  "Pine Bluff AR":   "Paper mills and defense depot need maintenance mechanics.",
  "Gadsden AL":      "Tire and rubber manufacturers report critical workforce shortages.",
  "Beaumont TX":     "Refinery turnaround season amplifies already-high welder demand.",
};

function demandForCity(cityName) {
  // Extract state abbreviation from the city name (last 2 chars)
  const stateAbbr = cityName.slice(-2);
  if (HIGH_DEMAND_STATES.has(stateAbbr)) {
    return Math.round(randRange(7000, 10000));
  }
  return Math.round(randRange(3000, 6000));
}

// ---------------------------------------------------------------------------
// Fetch helper (returns a Promise that resolves with the response body)
// ---------------------------------------------------------------------------
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";
  console.log("Fetching TopoJSON from", TOPO_URL, "...");
  const raw = await fetch(TOPO_URL);
  const topo = JSON.parse(raw);

  // The counties layer is usually called "counties"
  const countiesObj = topo.objects.counties;
  if (!countiesObj) {
    throw new Error("No 'counties' object found in TopoJSON");
  }

  const geometries = countiesObj.geometries;
  console.log(`Found ${geometries.length} county geometries.`);

  // ------ numeracy.json ------
  const numeracy = {};
  for (const geo of geometries) {
    const fips = String(geo.id).padStart(5, "0");
    const stateFips = fips.slice(0, 2);
    const stateAbbr = STATE_FIPS_TO_ABBR[stateFips] || "XX";
    const countyName = (geo.properties && geo.properties.name) || "Unknown";

    numeracy[fips] = {
      rate: rateForState(stateAbbr),
      county: countyName,
      state: stateAbbr,
    };
  }

  // ------ demand.json ------
  const demand = CITIES.map((city) => ({
    name: city.name,
    lat: city.lat,
    lng: city.lng,
    demand: demandForCity(city.name),
    description: DESCRIPTIONS[city.name] || "Manufacturing demand data.",
  }));

  // ------ Write files ------
  const dataDir = path.resolve(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const numeracyPath = path.join(dataDir, "numeracy.json");
  fs.writeFileSync(numeracyPath, JSON.stringify(numeracy, null, 2), "utf-8");
  console.log(`Wrote ${Object.keys(numeracy).length} entries to ${numeracyPath}`);

  const demandPath = path.join(dataDir, "demand.json");
  fs.writeFileSync(demandPath, JSON.stringify(demand, null, 2), "utf-8");
  console.log(`Wrote ${demand.length} entries to ${demandPath}`);

  console.log("Done.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
