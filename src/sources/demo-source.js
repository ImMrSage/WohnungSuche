export async function fetchDemoListings() {
  return [
    {
      id: "demo-saga-1",
      source: "Demo / SAGA Hamburg",
      title: "1-Zimmer-Wohnung in Hamburg-Nord",
      city: "Hamburg",
      location: "Hamburg-Nord",
      coldRent: 455,
      nebenkosten: 92,
      heizkosten: 68,
      warmRent: 615,
      rooms: 1,
      area: 39,
      url: "https://example.com/listing/demo-saga-1"
    },
    {
      id: "demo-expensive-1",
      source: "Demo / Other",
      title: "2 Zimmer Wohnung in Hamburg-Altona",
      city: "Hamburg",
      location: "Hamburg-Altona",
      bruttokaltRent: 760,
      warmRent: 910,
      rooms: 2,
      area: 54,
      url: "https://example.com/listing/demo-expensive-1"
    },
    {
      id: "demo-wg-1",
      source: "Demo / WG-Gesucht",
      title: "WG-Zimmer in Hamburg Eimsbuettel",
      city: "Hamburg",
      location: "Hamburg-Eimsbuettel",
      warmRent: 480,
      rooms: 1,
      area: 18,
      url: "https://example.com/listing/demo-wg-1"
    }
  ];
}
