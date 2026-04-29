export async function fetchDemoListings() {
  return [
    {
      id: "demo-saga-1",
      source: "Demo / SAGA-style",
      title: "1.5 Zimmer Wohnung in Hamburg-Nord",
      city: "Hamburg",
      location: "Hamburg-Nord",
      warmRent: 620,
      rooms: 1.5,
      area: 39,
      url: "https://example.com/listing/demo-saga-1"
    },
    {
      id: "demo-expensive-1",
      source: "Demo / Other",
      title: "2 Zimmer Wohnung in Hamburg-Altona",
      city: "Hamburg",
      location: "Hamburg-Altona",
      warmRent: 910,
      rooms: 2,
      area: 54,
      url: "https://example.com/listing/demo-expensive-1"
    }
  ];
}
