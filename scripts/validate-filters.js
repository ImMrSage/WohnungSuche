import assert from "node:assert/strict";
import { evaluateListing } from "../src/filters.js";

const criteria = {
  targetCity: "Hamburg",
  maxBruttokaltRent: 573,
  maxWarmRent: 650,
  softMaxWarmRent: 700
};

function evaluate(overrides) {
  return evaluateListing(
    {
      id: "test",
      source: "SAGA Hamburg",
      title: "1-Zimmer-Wohnung in Hamburg-Nord",
      city: "Hamburg",
      location: "Hamburg-Nord",
      coldRent: 450,
      nebenkosten: 90,
      heizkosten: 60,
      warmRent: 600,
      rooms: 1,
      area: 35,
      url: "https://example.com/test",
      ...overrides
    },
    criteria
  );
}

assert.equal(evaluate({}).matches, true, "accepts SAGA apartment inside Hamburg under BKM limit");
assert.equal(
  evaluate({ coldRent: undefined, nebenkosten: undefined, heizkosten: undefined, warmRent: 640 }).matches,
  true,
  "accepts warm-only listings up to fallback limit"
);
assert.equal(
  evaluate({ coldRent: 500, nebenkosten: 70, heizkosten: 90, warmRent: 660 }).matches,
  true,
  "accepts soft warm rent when BKM is clearly under limit"
);
assert.equal(
  evaluate({ coldRent: undefined, nebenkosten: undefined, heizkosten: undefined, warmRent: 680 }).matches,
  false,
  "rejects warm-only listings above fallback limit"
);
assert.equal(evaluate({ title: "WG-Zimmer in Hamburg" }).matches, false, "rejects WG rooms");
assert.equal(evaluate({ city: "Norderstedt", location: "Norderstedt" }).matches, false, "rejects outside Hamburg");
assert.equal(evaluate({ title: "Seniorenwohnung 60+ in Hamburg" }).matches, false, "rejects senior-only housing");

console.log("Filter validation passed.");
