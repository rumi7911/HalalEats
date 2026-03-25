import assert from "node:assert/strict";
import test from "node:test";

import { classifyProduct } from "../lib/halal-classifier.ts";

test("classifies clearly haram product names as haram without ingredients", () => {
  const result = classifyProduct("", [], {
    productName: "Pork Loin",
  });

  assert.equal(result.status, "haram");
  assert.equal(result.primaryEvidenceSource, "product_name");
  assert.equal(result.evidence[0]?.matchedValue, "pork");
});

test("does not auto-classify non-haram qualified meat terms as haram", () => {
  const result = classifyProduct("", [], {
    productName: "Turkey Bacon",
  });

  assert.equal(result.status, "mashbooh");
  assert.equal(result.primaryEvidenceSource, "fallback");
});

test("classifies qualified haram meat terms as haram", () => {
  const result = classifyProduct("", [], {
    productName: "Beef Pepperoni and Pork Pepperoni Combo",
  });

  assert.equal(result.status, "haram");
  assert.equal(result.primaryEvidenceSource, "product_name");
  assert.match(result.evidence[0]?.matchedValue ?? "", /pork|pepperoni/);
});

test("classifies unqualified gelatin in ingredients as haram", () => {
  const result = classifyProduct("Sugar, Gelatin, Natural Flavor", []);

  assert.equal(result.status, "haram");
  assert.equal(result.primaryEvidenceSource, "ingredients");
  assert.equal(result.evidence[0]?.matchedValue, "gelatin");
});

test("classifies fish gelatin as mashbooh", () => {
  const result = classifyProduct("Sugar, Fish Gelatin, Citric Acid", []);

  assert.equal(result.status, "mashbooh");
  assert.equal(result.primaryEvidenceSource, "ingredients");
  assert.equal(result.evidence[0]?.matchedValue, "gelatin");
});

test("classifies haram e-numbers correctly", () => {
  const result = classifyProduct("Colour: E120, Sugar", []);

  assert.equal(result.status, "haram");
  assert.equal(result.primaryEvidenceSource, "ingredients");
  assert.equal(result.evidence[0]?.matchedValue, "carmine");
});

test("classifies mashbooh e-numbers correctly", () => {
  const result = classifyProduct("Emulsifier: E471", []);

  assert.equal(result.status, "mashbooh");
  assert.equal(result.primaryEvidenceSource, "ingredients");
  assert.equal(result.evidence[0]?.matchedValue, "mono and diglycerides");
});

test("classifies clean plant ingredients as halal", () => {
  const result = classifyProduct("Water, Oats, Salt", []);

  assert.equal(result.status, "halal");
  assert.equal(result.primaryEvidenceSource, "ingredients");
});

test("uses explicit haram category metadata when ingredients are missing", () => {
  const result = classifyProduct("", [], {
    productName: "Breakfast Slices",
    categories: "Pork products, sliced meats",
  });

  assert.equal(result.status, "haram");
  assert.equal(result.primaryEvidenceSource, "metadata");
  assert.equal(result.evidence[0]?.matchedValue, "pork");
});

test("falls back to mashbooh when no ingredients or metadata are available", () => {
  const result = classifyProduct("", [], {
    productName: "Mystery Product",
  });

  assert.equal(result.status, "mashbooh");
  assert.equal(result.primaryEvidenceSource, "fallback");
  assert.equal(
    result.evidence[0]?.rule,
    "missing_ingredient_data_inconclusive_metadata",
  );
});

test("falls back to mashbooh when ingredient data is unusable", () => {
  const result = classifyProduct("Contains: **", []);

  assert.equal(result.status, "mashbooh");
  assert.equal(result.primaryEvidenceSource, "fallback");
  assert.equal(result.evidence[0]?.rule, "unusable_ingredient_data");
});
