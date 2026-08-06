import { describe, expect, it } from "vitest";
import type { IndustrialZoneSummary } from "./ports.js";
import { orderForPublicListing } from "./zone.js";

const zone = (city: string, isPilot: boolean): IndustrialZoneSummary => ({
  id: city.toLowerCase(),
  name: `Zone ${city}`,
  city,
  region: "Casablanca-Settat",
  lat: 33,
  lng: -7,
  isPilot,
});

describe("orderForPublicListing", () => {
  it("place les zones pilotes en tete", () => {
    const ordered = orderForPublicListing([zone("Agadir", false), zone("Zenata", true)]);
    expect(ordered.map((z) => z.city)).toEqual(["Zenata", "Agadir"]);
  });

  it("classe par ville a statut egal", () => {
    const ordered = orderForPublicListing([
      zone("Tanger", false),
      zone("Agadir", false),
      zone("Mohammedia", false),
    ]);
    expect(ordered.map((z) => z.city)).toEqual(["Agadir", "Mohammedia", "Tanger"]);
  });

  it("ne modifie pas le tableau recu", () => {
    const input = [zone("Agadir", false), zone("Zenata", true)];
    orderForPublicListing(input);
    expect(input.map((z) => z.city)).toEqual(["Agadir", "Zenata"]);
  });
});
