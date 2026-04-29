const HAMBURG_LOCATIONS = [
  "hamburg",
  "altona",
  "bergedorf",
  "eimsbuettel",
  "eimsbüttel",
  "hamburg-mitte",
  "hamburg-nord",
  "harburg",
  "wandsbek",
  "barmbek",
  "barmbek-nord",
  "barmbek-sued",
  "barmbek-süd",
  "billstedt",
  "blankenese",
  "bramfeld",
  "cranz",
  "duvenstedt",
  "eidelstedt",
  "eppendorf",
  "farmsen",
  "farmsen-berne",
  "finkenwerder",
  "fuhlsbuettel",
  "fuhlsbüttel",
  "gross borstel",
  "groß borstel",
  "hamm",
  "hammerbrook",
  "heimfeld",
  "hoheluft-ost",
  "hoheluft-west",
  "hoheluft",
  "horn",
  "jenfeld",
  "langenbek",
  "langenhorn",
  "lokstedt",
  "lurup",
  "marienthal",
  "niendorf",
  "neugraben",
  "neugraben-fischbek",
  "neustadt",
  "ohlsdorf",
  "osdorf",
  "ottensen",
  "poppenbuettel",
  "poppenbüttel",
  "rahlstedt",
  "rothenburgsort",
  "sasel",
  "schnelsen",
  "st. georg",
  "st georg",
  "st. pauli",
  "st pauli",
  "sternschanze",
  "steilshoop",
  "tonndorf",
  "uhlenhorst",
  "volksdorf",
  "wilhelmsburg",
  "winterhude"
];

const REJECT_PATTERNS = [
  /\bwg\b/i,
  /wohngemeinschaft/i,
  /wg-zimmer/i,
  /\bshared\b/i,
  /mitbewohner/i,
  /tausch/i,
  /tauschen/i,
  /wohnungstausch/i,
  /\bswap\b/i,
  /seniorenwohnung/i,
  /senioren/i,
  /betreutes wohnen/i,
  /pflegewohnen/i,
  /\b60\+/i,
  /\b65\+/i,
  /monteurzimmer/i,
  /ferienwohnung/i,
  /holiday rental/i,
  /temporary rental/i,
  /zwischenmiete/i,
  /untermiete/i
];

const APARTMENT_PATTERNS = [
  /wohnung/i,
  /1[-\s]?zimmer[-\s]?wohnung/i,
  /apartment/i,
  /appartement/i,
  /studio/i,
  /single apartment/i
];

const SOCIAL_PATTERNS = [/sozialwohnung/i, /oeffentlich gefoerdert/i, /öffentlich gefördert/i, /\bwbs\b/i];
const SAGA_PATTERN = /\bsaga\b/i;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function collectText(listing) {
  return [
    listing.title,
    listing.description,
    listing.source,
    listing.city,
    listing.location,
    listing.district,
    listing.housingType
  ]
    .filter(Boolean)
    .join(" ");
}

function numberFrom(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const raw = String(value).replace(/[^\d,.]/g, "");
    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");
    const normalized =
      hasComma && hasDot
        ? raw.replace(/\./g, "").replace(",", ".")
        : !hasComma && hasDot && /^\d{1,3}(\.\d{3})+$/.test(raw)
          ? raw.replace(/\./g, "")
          : raw.replace(",", ".");
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function analyzePrices(listing) {
  const coldRent = numberFrom(listing.coldRent, listing.kaltmiete, listing.netRent);
  const operatingCosts = numberFrom(
    listing.operatingCosts,
    listing.nebenkosten,
    listing.betriebskosten,
    listing.serviceCharges
  );
  const heatingCosts = numberFrom(listing.heatingCosts, listing.heizkosten);
  const warmRent = numberFrom(listing.warmRent, listing.warmmiete, listing.totalRent);
  const explicitBruttokaltRent = numberFrom(
    listing.bruttokaltRent,
    listing.bruttokaltmiete,
    listing.grossColdRent
  );

  let bruttokaltRent = explicitBruttokaltRent;
  let bruttokaltMethod = explicitBruttokaltRent === undefined ? undefined : "listed";

  if (bruttokaltRent === undefined && coldRent !== undefined && operatingCosts !== undefined) {
    bruttokaltRent = coldRent + operatingCosts;
    bruttokaltMethod = "cold_plus_costs";
  }

  if (bruttokaltRent === undefined && warmRent !== undefined && heatingCosts !== undefined) {
    bruttokaltRent = warmRent - heatingCosts;
    bruttokaltMethod = "warm_minus_heating";
  }

  return {
    coldRent,
    operatingCosts,
    heatingCosts,
    warmRent,
    bruttokaltRent,
    bruttokaltMethod
  };
}

function matchesHamburg(listing) {
  const city = normalizeText(listing.city);
  const locationText = normalizeText([listing.location, listing.district].filter(Boolean).join(" "));

  if (city && city !== "hamburg" && !city.includes("hamburg")) {
    return false;
  }

  const haystack = [city, locationText].join(" ");
  if (!city && /(bei|nahe|nähe|umland|near)\s+hamburg/i.test(haystack)) {
    return false;
  }

  return HAMBURG_LOCATIONS.some((location) => haystack.includes(location));
}

function matchesHousingType(listing) {
  const text = collectText(listing);
  const hasApartmentSignal = APARTMENT_PATTERNS.some((pattern) => pattern.test(text));
  const hasZimmer = /\bzimmer\b/i.test(text);
  const hasOneRoomApartment = /1[-\s]?(zimmer|zi\.?)[-\s]?(wohnung|apartment|appartement)/i.test(text);

  if (REJECT_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      reason: "rejected keyword for WG, swap, senior, temporary, or room-only housing"
    };
  }

  if (hasZimmer && !hasOneRoomApartment && !hasApartmentSignal) {
    return {
      ok: false,
      reason: "contains Zimmer/room without a clear full-apartment signal"
    };
  }

  if (!hasApartmentSignal) {
    return {
      ok: false,
      reason: "not clearly a full apartment"
    };
  }

  return { ok: true };
}

function priceMatches(price, criteria) {
  if (price.bruttokaltRent !== undefined) {
    if (price.bruttokaltRent > criteria.maxBruttokaltRent) {
      return {
        ok: false,
        reason: `Bruttokaltmiete ${price.bruttokaltRent.toFixed(0)} EUR is above ${criteria.maxBruttokaltRent} EUR`
      };
    }

    if (price.warmRent !== undefined && price.warmRent > criteria.softMaxWarmRent) {
      return {
        ok: false,
        reason: `Warmmiete ${price.warmRent.toFixed(0)} EUR is above soft upper bound ${criteria.softMaxWarmRent} EUR`
      };
    }

    return {
      ok: true,
      reason: `Bruttokaltmiete ${price.bruttokaltRent.toFixed(0)} EUR <= ${criteria.maxBruttokaltRent} EUR`
    };
  }

  if (price.warmRent !== undefined && price.warmRent <= criteria.maxWarmRent) {
    return {
      ok: true,
      reason: `only Warmmiete is known and ${price.warmRent.toFixed(0)} EUR <= ${criteria.maxWarmRent} EUR`
    };
  }

  return {
    ok: false,
    reason: "price structure is unclear or likely above limit"
  };
}

export function getSourcePriority(listing) {
  const text = collectText(listing);

  if (SAGA_PATTERN.test(text)) {
    return 1;
  }

  if (SOCIAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return 2;
  }

  return 3;
}

export function evaluateListing(listing, criteria) {
  if (!listing?.id || !listing?.url) {
    return { matches: false, reason: "missing id or direct URL" };
  }

  if (!matchesHamburg(listing)) {
    return { matches: false, reason: "outside Hamburg or location unclear" };
  }

  const housing = matchesHousingType(listing);
  if (!housing.ok) {
    return { matches: false, reason: housing.reason };
  }

  const price = analyzePrices(listing);
  const priceDecision = priceMatches(price, criteria);

  if (!priceDecision.ok) {
    return {
      matches: false,
      reason: priceDecision.reason,
      price
    };
  }

  return {
    matches: true,
    reason: priceDecision.reason,
    price,
    priority: getSourcePriority(listing)
  };
}

export function listingMatchesCriteria(listing, criteria) {
  return evaluateListing(listing, criteria).matches;
}

function money(value) {
  return value === undefined ? "unknown" : `${value.toFixed(0)} EUR`;
}

function statusLabel(status) {
  if (status === "OPENED") {
    return "✅ OPENED";
  }

  if (status === "APPLIED") {
    return "✅ APPLIED";
  }

  if (status === "IGNORED") {
    return "IGNORED";
  }

  return "NEW";
}

export function formatListingMessage(record) {
  const listing = record.listing || record;
  const price = record.price || analyzePrices(listing);
  const reason = record.matchReason || record.reason || "matches configured criteria";

  const lines = [
    `Status: ${statusLabel(record.status || "NEW")}`,
    `Title: ${listing.title || "Unknown title"}`,
    "",
    "Price breakdown:",
    `- Kaltmiete: ${money(price.coldRent)}`,
    `- Betriebskosten/Nebenkosten: ${money(price.operatingCosts)}`,
    `- Heizkosten: ${money(price.heatingCosts)}`,
    `- Bruttokaltmiete: ${money(price.bruttokaltRent)}${price.bruttokaltMethod ? ` (${price.bruttokaltMethod})` : ""}`,
    `- Warmmiete: ${money(price.warmRent)}`,
    "",
    `District/location: ${listing.location || listing.district || listing.city || "unknown"}`,
    `Size: ${listing.area || listing.size || "unknown"} m2`,
    `Rooms: ${listing.rooms || "unknown"}`,
    `Source: ${listing.source || "unknown"}`,
    `Direct link: ${listing.url}`,
    "",
    `Match reason: ${reason}`
  ];

  return lines.join("\n");
}
