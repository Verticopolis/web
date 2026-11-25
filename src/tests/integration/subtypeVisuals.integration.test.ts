import { describe, it, expect } from "vitest";
import { catalogFor } from "../catalogFixture";
import { catalogFacility } from "@verticopolis/components/render/catalogIndex";
import {
  AMUSEMENTS_LOOKS,
  BOUTIQUE_LOOKS,
  CLINIC_LOOKS,
  FASTFOOD_LOOKS,
  FITNESS_LOOKS,
  FOODHALL_LOOKS,
  RESTAURANT_LOOKS,
  SHOP_LOOKS,
} from "@verticopolis/components/render/pixelSprites";
import type { FacilityKind } from "@verticopolis/engine/model/types";

/** `kind`'s subtypes as the engine's Modern catalog lists them. */
const subtypes = (kind: FacilityKind): readonly string[] => catalogFacility(catalogFor("modern"), kind).subtypes ?? [];
const FASTFOOD_SUBTYPES = subtypes("fastFood");
const RESTAURANT_SUBTYPES = subtypes("restaurant");
const SHOP_SUBTYPES = subtypes("shop");
const FOODHALL_SUBTYPES = subtypes("foodHall");
const AMUSEMENTS_SUBTYPES = subtypes("amusements");
const BOUTIQUE_SUBTYPES = subtypes("boutiqueBay");
const FITNESS_SUBTYPES = subtypes("fitnessClub");
const CLINIC_SUBTYPES = subtypes("clinic");

/**
 * Guards the retail-subtype visual system:
 *   - Every canon variant name has its own look entry (and no look entry
 *     names a variant that does not exist), so a new canon name cannot ship
 *     without art and a typo cannot orphan an entry.
 *   - Within a kind, every look is distinct: "different visuals for every
 *     different type" is the feature, so two variants collapsing onto the
 *     same colors is a regression even though nothing crashes.
 *   - The look is a pure function of `Unit.subtype`. That every canon
 *     variant survives a `.TDT` export and import is the engine's to prove
 *     (`tests/tdt_carry.rs` in Verticopolis/engine).
 */

const KINDS: [FacilityKind, readonly string[], Record<string, unknown>][] = [
  ["fastFood", FASTFOOD_SUBTYPES, FASTFOOD_LOOKS],
  ["restaurant", RESTAURANT_SUBTYPES, RESTAURANT_LOOKS],
  ["shop", SHOP_SUBTYPES, SHOP_LOOKS],
];

describe("retail subtype look tables", () => {
  for (const [kind, names, looks] of KINDS) {
    it(`${kind}: every canon variant has a look, and no look is orphaned`, () => {
      expect(Object.keys(looks).sort()).toEqual([...names].sort());
    });

    it(`${kind}: every variant look is visually distinct`, () => {
      const seen = new Map<string, string>();
      for (const name of names) {
        const key = JSON.stringify(looks[name]);
        const clash = seen.get(key);
        expect(clash, `${name} and ${clash ?? "?"} share an identical look`).toBeUndefined();
        seen.set(key, name);
      }
    });
  }
});

// The Modern Food Hall's stalls carry the same "every variant is visually
// distinct" guarantee. They are Modern-only, so a .TDT file never holds them.
describe("Modern Food Hall stall looks", () => {
  it("every stall has a look, and no look is orphaned", () => {
    expect(Object.keys(FOODHALL_LOOKS).sort()).toEqual([...FOODHALL_SUBTYPES].sort());
  });

  it("every stall look is visually distinct", () => {
    const seen = new Map<string, string>();
    const walls = new Set<string>();
    for (const name of FOODHALL_SUBTYPES) {
      const look = FOODHALL_LOOKS[name];
      const key = JSON.stringify(look);
      const clash = seen.get(key);
      expect(clash, `${name} and ${clash ?? "?"} share an identical look`).toBeUndefined();
      seen.set(key, name);
      walls.add(look.wall);
    }
    // Distinct WALL colors too, not just distinct objects: two stalls whose only
    // difference is an imperceptible field would still read as the same room.
    expect(walls.size, "two stalls share a wall color").toBe(FOODHALL_SUBTYPES.length);
  });
});

// The Modern Amusements attractions carry the same "every variant is visually
// distinct" guarantee. They are Modern-only, so a .TDT file never holds them.
describe("Modern Amusements attraction looks", () => {
  it("every attraction has a look, and no look is orphaned", () => {
    expect(Object.keys(AMUSEMENTS_LOOKS).sort()).toEqual([...AMUSEMENTS_SUBTYPES].sort());
  });

  it("every attraction look is visually distinct", () => {
    const seen = new Map<string, string>();
    const walls = new Set<string>();
    const attractions = new Set<string>();
    for (const name of AMUSEMENTS_SUBTYPES) {
      const look = AMUSEMENTS_LOOKS[name];
      const key = JSON.stringify(look);
      const clash = seen.get(key);
      expect(clash, `${name} and ${clash ?? "?"} share an identical look`).toBeUndefined();
      seen.set(key, name);
      walls.add(look.wall);
      attractions.add(look.attraction);
    }
    // Distinct WALL colors AND distinct interiors: each attraction draws its own
    // room, not just a recolor, so all four render unmistakably differently.
    expect(walls.size, "two attractions share a wall color").toBe(AMUSEMENTS_SUBTYPES.length);
    expect(attractions.size, "two attractions share an interior").toBe(AMUSEMENTS_SUBTYPES.length);
  });
});

// The Modern Boutique Bay trades carry the same "every variant is visually
// distinct" guarantee. They are Modern-only, so a .TDT file never holds them.
describe("Modern Boutique Bay trade looks", () => {
  it("every trade has a look, and no look is orphaned", () => {
    expect(Object.keys(BOUTIQUE_LOOKS).sort()).toEqual([...BOUTIQUE_SUBTYPES].sort());
  });

  it("every trade look is visually distinct", () => {
    const seen = new Map<string, string>();
    const walls = new Set<string>();
    const trades = new Set<string>();
    for (const name of BOUTIQUE_SUBTYPES) {
      const look = BOUTIQUE_LOOKS[name];
      const key = JSON.stringify(look);
      const clash = seen.get(key);
      expect(clash, `${name} and ${clash ?? "?"} share an identical look`).toBeUndefined();
      seen.set(key, name);
      walls.add(look.wall);
      trades.add(look.trade);
    }
    // Distinct WALL colors AND distinct trades: each trade draws its own
    // shopfront, so all seven render unmistakably differently.
    expect(walls.size, "two trades share a wall color").toBe(BOUTIQUE_SUBTYPES.length);
    expect(trades.size, "two trades share an interior").toBe(BOUTIQUE_SUBTYPES.length);
  });
});

// The Modern Fitness Club formats carry the same "every variant is visually
// distinct" guarantee. They are Modern-only, so a .TDT file never holds them.
describe("Modern Fitness Club format looks", () => {
  it("every format has a look, and no look is orphaned", () => {
    expect(Object.keys(FITNESS_LOOKS).sort()).toEqual([...FITNESS_SUBTYPES].sort());
  });

  it("every format look is visually distinct", () => {
    const seen = new Map<string, string>();
    const walls = new Set<string>();
    const formats = new Set<string>();
    for (const name of FITNESS_SUBTYPES) {
      const look = FITNESS_LOOKS[name];
      const key = JSON.stringify(look);
      const clash = seen.get(key);
      expect(clash, `${name} and ${clash ?? "?"} share an identical look`).toBeUndefined();
      seen.set(key, name);
      walls.add(look.wall);
      formats.add(look.format);
    }
    // Distinct WALL colors AND distinct formats: each draws its own equipment,
    // not a recolor, so all five render unmistakably differently.
    expect(walls.size, "two formats share a wall color").toBe(FITNESS_SUBTYPES.length);
    expect(formats.size, "two formats share an interior").toBe(FITNESS_SUBTYPES.length);
  });
});

// The Modern Clinic practices carry the same "every variant is visually
// distinct" guarantee. They are Modern-only, so a .TDT file never holds them.
describe("Modern Clinic practice looks", () => {
  it("every practice has a look, and no look is orphaned", () => {
    expect(Object.keys(CLINIC_LOOKS).sort()).toEqual([...CLINIC_SUBTYPES].sort());
  });

  it("every practice look is visually distinct", () => {
    const seen = new Map<string, string>();
    const walls = new Set<string>();
    const practices = new Set<string>();
    for (const name of CLINIC_SUBTYPES) {
      const look = CLINIC_LOOKS[name];
      const key = JSON.stringify(look);
      const clash = seen.get(key);
      expect(clash, `${name} and ${clash ?? "?"} share an identical look`).toBeUndefined();
      seen.set(key, name);
      walls.add(look.wall);
      practices.add(look.practice);
    }
    expect(walls.size, "two practices share a wall color").toBe(CLINIC_SUBTYPES.length);
    expect(practices.size, "two practices share an interior").toBe(CLINIC_SUBTYPES.length);
  });
});
