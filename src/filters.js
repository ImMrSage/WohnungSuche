function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function listingMatchesCriteria(listing, criteria) {
  const cityMatches =
    normalizeText(listing.city).includes(normalizeText(criteria.targetCity)) ||
    normalizeText(listing.location).includes(normalizeText(criteria.targetCity));

  const warmRent = Number(listing.warmRent);
  const rentMatches = Number.isFinite(warmRent) && warmRent <= criteria.maxWarmRent;

  return cityMatches && rentMatches;
}

export function formatListingMessage(listing) {
  const lines = [
    `Neue Wohnung: ${listing.source}`,
    "",
    listing.title ? `Titel: ${listing.title}` : null,
    listing.warmRent ? `Warmmiete: ${listing.warmRent} EUR` : null,
    listing.rooms ? `Zimmer: ${listing.rooms}` : null,
    listing.area ? `Flaeche: ${listing.area} m²` : null,
    listing.location ? `Ort: ${listing.location}` : null,
    listing.url ? `Link: ${listing.url}` : null
  ].filter(Boolean);

  return lines.join("\n");
}
