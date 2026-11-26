import { describe, expect, it, vi } from "vitest";
import { catalogFacility } from "@verticopolis/components/render/catalogIndex";
import { catalogFor } from "../tests/catalogFixture";
import type { CardKit } from "./cardKit";
import { createInspector, inspectCard, type InspectorDeps } from "./inspector";

vi.mock("../engineHost/headerClock", () => ({ clockOf: () => ({ hour: 14 }) }));
vi.mock("@verticopolis/components/windows/inspectCard", () => ({
  unitCardTemplate: vi.fn((u: { id: number }, _c: unknown, hour: number, lines: unknown, opts: unknown) => ({
    unit: u.id,
    hour,
    lines,
    opts,
  })),
  transportCardTemplate: vi.fn((t: { id: number }, _c: unknown, lines: unknown, opts: unknown) => ({
    shaft: t.id,
    lines,
    opts,
  })),
}));

/**
 * The game's side of the hover inspector over a mock card kit: which card it
 * asks the port for, where it pins the panel, and the problem lines and ✕ it
 * hands the components' card. The card's text and the ✕ latch are the
 * components' (`windows/inspectCard`, `windows/inspectPanel`).
 */

const CATALOG = catalogFor("classic");
const condo = { id: 3, kind: "condo", x: 10, width: 4, floor: 5 };
const lift = { id: 8, kind: "elevatorStandard", x: 40, width: 1, top: 9 };

function setup() {
  const cards = {
    unit: vi.fn((id: number) => (id === condo.id ? condo : undefined)),
    shaft: vi.fn((id: number) => (id === lift.id ? lift : undefined)),
  };
  const diagnostics = {
    unit: vi.fn(() => ["unit facts"]),
    transport: vi.fn(() => ["shaft facts"]),
  };
  const kit = { cards, diagnostics, catalog: () => CATALOG } as unknown as CardKit;
  const ui = { showInspector: vi.fn(), cb: { onInspectorClose: vi.fn() } };
  const deps = {
    kit: () => kit,
    reader: () => ({ header: {} as never }),
    ui: () => ui,
    setAnchor: vi.fn(),
  } satisfies InspectorDeps;
  return { cards, diagnostics, deps, ui };
}

describe("the inspect card the game hands over", () => {
  it("draws a unit's card at the hour, with its problem lines and the ✕, pinned over its top floor", () => {
    const { deps, diagnostics, ui } = setup();
    const card = inspectCard(deps, { type: "unit", id: condo.id }, true);
    const floors = catalogFacility(CATALOG, "condo").floors;
    expect(card?.anchor).toEqual({ x: condo.x + condo.width, left: condo.x, floor: condo.floor + floors - 1 });
    expect(card?.body).toMatchObject({ unit: condo.id, hour: 14, lines: ["unit facts"] });
    (card?.body as unknown as { opts: { close(): void } }).opts.close();
    expect(ui.cb.onInspectorClose).toHaveBeenCalledOnce();
    inspectCard(deps, { type: "unit", id: condo.id }, false);
    expect(diagnostics.unit.mock.calls).toEqual([
      [condo.id, true],
      [condo.id, false],
    ]);
  });

  it("draws a shaft's card pinned at its top", () => {
    const { deps, diagnostics, ui } = setup();
    const card = inspectCard(deps, { type: "transport", id: lift.id }, true);
    expect(card?.anchor).toEqual({ x: lift.x + lift.width, left: lift.x, floor: lift.top });
    expect(card?.body).toMatchObject({ shaft: lift.id, lines: ["shaft facts"] });
    (card?.body as unknown as { opts: { close(): void } }).opts.close();
    expect(ui.cb.onInspectorClose).toHaveBeenCalledOnce();
    expect(diagnostics.transport).toHaveBeenCalledExactlyOnceWith(lift.id);
  });

  it("has no card for a facility that is gone", () => {
    const { deps } = setup();
    expect(inspectCard(deps, { type: "unit", id: 99 }, true)).toBeNull();
    expect(inspectCard(deps, { type: "transport", id: 99 }, true)).toBeNull();
  });

  it("drives the components' controller with these cards, asking the port again on every pick", () => {
    const { deps, cards, ui } = setup();
    const inspector = createInspector(deps);
    inspector.inspect({ type: "unit", id: condo.id, kind: "condo" });
    expect(ui.showInspector.mock.lastCall?.[0]).toMatchObject({ unit: condo.id });
    expect(deps.setAnchor.mock.lastCall?.[0]).toMatchObject({ left: condo.x });
    inspector.followStep(() => true);
    expect(cards.unit).toHaveBeenCalledTimes(2);
    inspector.inspect({ type: "unit", id: 99, kind: "office" });
    expect(ui.showInspector).toHaveBeenLastCalledWith(null);
    expect(deps.setAnchor).toHaveBeenLastCalledWith(null);
  });
});
