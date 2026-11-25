import { describe, it, expect } from "vitest";
import { draftFromSave, draftTower, type Draft } from "../portKit/drafts";
import { noEngine } from "../portKit/rustEngine";
import { catalogFor } from "../catalogFixture";
import { catalogFacility } from "@verticopolis/components/render/catalogIndex";
import { drawRoom, type RoomCtx } from "@verticopolis/components/render/pixelSprites";
import type { FacilityKind, Unit } from "@verticopolis/engine/model/types";

/** The engine catalog's facts for `kind` (the subtypes match in both modes). */
const facts = (kind: FacilityKind) => catalogFacility(catalogFor("classic"), kind);
const FASTFOOD_SUBTYPES = facts("fastFood").subtypes ?? [];
const RESTAURANT_SUBTYPES = facts("restaurant").subtypes ?? [];
const SHOP_SUBTYPES = facts("shop").subtypes ?? [];

/**
 * Shift-left contract for the visual variety system: EVERYTHING a room's art
 * derives from must live in the persisted save, so a reload paints the same
 * pixels. The inputs are `kind`, `subtype` (retail varieties), geography
 * (`floor`, `x`: the geo seed for layouts, mirroring, and tints), and `id`
 * (grandfathered accent/diner seeds). This suite paints every kind and every
 * canon variety, round-trips the tower through serialize/deserialize (the
 * .vctower path), then paints again and byte-compares the full paint logs.
 * If a future visual input is added without surviving the save, these tests
 * fail the same day the art lands. That the `.TDT` format keeps a room's
 * subtype and spot is the engine's to prove (`tests/tdt_carry.rs` in
 * Verticopolis/engine).
 */

/** A recording 2D-context stand-in (mirrors the spyCtx in sprites.test.ts). */
function spyCtx() {
  const log: string[] = [];
  const grad = { addColorStop: (...a: unknown[]) => log.push("stop:" + JSON.stringify(a)) };
  const ctx: Record<string, unknown> = {};
  const methods = [
    "save",
    "restore",
    "beginPath",
    "closePath",
    "moveTo",
    "lineTo",
    "arc",
    "arcTo",
    "quadraticCurveTo",
    "bezierCurveTo",
    "rect",
    "roundRect",
    "ellipse",
    "fill",
    "stroke",
    "fillRect",
    "strokeRect",
    "clearRect",
    "fillText",
    "strokeText",
    "translate",
    "scale",
    "rotate",
    "clip",
    "setLineDash",
    "drawImage",
  ];
  for (const m of methods) ctx[m] = (...a: unknown[]) => log.push(`${m}:${JSON.stringify(a)}`);
  ctx.createLinearGradient = (...a: unknown[]) => (log.push(`grad:${JSON.stringify(a)}`), grad);
  ctx.createRadialGradient = (...a: unknown[]) => (log.push(`rgrad:${JSON.stringify(a)}`), grad);
  ctx.measureText = () => ({ width: 10 });
  for (const p of [
    "fillStyle",
    "strokeStyle",
    "lineWidth",
    "globalAlpha",
    "font",
    "textAlign",
    "textBaseline",
    "lineCap",
    "lineJoin",
  ]) {
    let v: unknown = "";
    Object.defineProperty(ctx, p, { get: () => v, set: (nv) => (log.push(`${p}=${String(nv)}`), void (v = nv)) });
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, log, sig: () => log.join("|") };
}

function paint(u: Unit, hour: number): string {
  const s = spyCtx();
  const d: RoomCtx = { ctx: s.ctx, lit: true, anim: 0.5, hour };
  drawRoom(d, u, 0, 0, 160, 26);
  return s.sig();
}

/** Paint hour per kind: inside business hours for commercial, evening else. */
function hourFor(kind: FacilityKind): number {
  if (kind === "shop") return 14;
  if (kind === "fastFood") return 12;
  if (kind === "restaurant") return 19;
  if (kind === "cinema") return 20;
  return 20;
}

/** The rooms as the engine holds them, painted from its records. */
const roomsOf = (sim: Draft): Unit[] => (sim.settle(), sim.tower.units as unknown as Unit[]);

describe.skipIf(noEngine)("save round-trip paints identical pixels (.vctower serialize/deserialize)", () => {
  /** Rooms across kinds, positions, and every canon retail variety, spread
   *  over floors so the geo seed exercises different layouts and mirrors. */
  function buildFixture(): Draft {
    const sim = draftTower(2024, "modern", "realWorld");
    sim.money = 100_000_000;
    for (let x = 0; x < 120; x++) sim.tower.place("lobby", 1, x);
    for (let f = 2; f <= 14; f++) for (let x = 0; x < 120; x++) sim.tower.place("floor", f, x);
    // Offices and condos at varied positions (layout + mirror coverage).
    for (const [f, x] of [
      [2, 0],
      [2, 12],
      [2, 24],
      [3, 5],
      [3, 40],
      [4, 9],
    ] as const)
      sim.tower.place("office", f, x);
    for (const [f, x] of [
      [5, 0],
      [5, 14],
      [6, 3],
      [6, 30],
    ] as const)
      sim.tower.place("condo", f, x);
    for (const [f, x, k] of [
      [7, 0, "hotelSingle"],
      [7, 10, "hotelDouble"],
      [7, 30, "hotelSuite"],
    ] as const) {
      sim.tower.place(k as FacilityKind, f, x);
    }
    // Every canon retail variety, one unit each.
    let f = 8;
    let x = 0;
    const placeRetail = (kind: FacilityKind, subtype: string) => {
      let width = 12;
      if (kind === "restaurant") width = 24;
      else if (kind === "fastFood") width = 16;
      if (x + width >= 120) {
        f += 1;
        x = 0;
      }
      const r = sim.tower.place(kind, f, x);
      const u = sim.tower.getUnit(r.unitId!) as unknown as Unit;
      u.state = "occupied";
      u.subtype = subtype;
      x += width + 2;
    };
    for (const name of FASTFOOD_SUBTYPES) placeRetail("fastFood", name);
    for (const name of RESTAURANT_SUBTYPES) placeRetail("restaurant", name);
    for (const name of SHOP_SUBTYPES) placeRetail("shop", name);
    sim.tower.place("cinema", 13, 0);
    // Occupy everything so the art draws its lived-in state. Attendance
    // venues (the cinema here) are exempt from the occupants stamp: their
    // occupants mirrors the transient live-attendance tally and restores to
    // 0 on load by design, so a pinned nonzero value would (correctly) fail
    // the round-trip. Their empty-house paint is still compared.
    for (const u of sim.tower.units as unknown as Unit[]) {
      if (u.kind === "floor" || u.kind === "lobby") continue;
      if (u.state === "empty" || u.state === "construction") u.state = "occupied";
      if (u.occupants === 0 && facts(u.kind).attendance === null) u.occupants = 3;
    }
    sim.settle(); // the engine holds the tower as painted below
    return sim;
  }

  it("every room paints byte-identical after serialize -> deserialize", () => {
    const sim = buildFixture();
    const before = new Map<string, string>();
    for (const u of roomsOf(sim)) {
      if (u.kind === "floor" || u.kind === "lobby") continue;
      before.set(`${u.floor}:${u.x}`, paint(u, hourFor(u.kind)));
    }
    expect(before.size).toBeGreaterThan(30);
    const restored = draftFromSave(sim.serialize());
    let compared = 0;
    for (const u of roomsOf(restored)) {
      if (u.kind === "floor" || u.kind === "lobby") continue;
      const key = `${u.floor}:${u.x}`;
      const prior = before.get(key);
      expect(prior, `no pre-save paint recorded for ${u.kind} at ${key}`).toBeDefined();
      expect(paint(u, hourFor(u.kind)), `${u.kind} at ${key} paints differently after reload`).toBe(prior);
      compared++;
    }
    expect(compared).toBe(before.size);
  });
});
