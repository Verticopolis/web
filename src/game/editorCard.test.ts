import { describe, expect, it, vi } from "vitest";
import { html, render } from "lit-html";
import type { TemplateResult } from "lit-html";
import type { TransportDetail, UnitDetail } from "@verticopolis/engine/port/panels";
import { catalogFor } from "../tests/catalogFixture";
import { transportDetail, unitDetail } from "../tests/fixtures/detailCards";
import { refreshEditorCard, type EditorCardApp } from "./editorCard";
import type { CardKit } from "./cardKit";

/**
 * `refreshEditorCard` over a stand-in card kit: which card it draws for the
 * selection, that the drawn card's buttons and ✕ reach the UI's edit actions,
 * the mobile fold-in, and the selection clearing when the facility is gone.
 * The card bodies themselves are covered in `editor.test.ts`.
 */

const OFFICE = 12;
const SHAFT = 73;
const LINE: TemplateResult = html`<div class="fold-line">Avg load: 90% full</div>`;

/** A 07:00 weekday header: what the unit card reads for its clock. */
const HEADER = {
  minutes: 7 * 60,
  day: 1,
  dayOfWeek: 1,
  isWeekend: false,
  quarter: 1,
  year: 1,
  weekDays: 5,
  weekendDays: 2,
  modernCalendar: undefined,
};

function app(
  selected: EditorCardApp["selected"],
  over: { unit?: UnitDetail; shaft?: TransportDetail; mobile?: boolean } = {},
) {
  const el = document.createElement("div");
  const kit = {
    cards: { unit: vi.fn(() => over.unit), shaft: vi.fn(() => over.shaft) },
    catalog: () => catalogFor("classic"),
    diagnostics: { unit: vi.fn(() => [LINE]), invalidate: vi.fn(), transport: vi.fn(() => [LINE]) },
  };
  const ui = {
    renderEditor: vi.fn((t: TemplateResult) => render(t, el)),
    hideEditor: vi.fn(),
    editAction: vi.fn(),
  };
  const a = {
    selected,
    engine: { selectedId: null as number | null },
    ui,
    mobileMq: { matches: over.mobile ?? false },
    cardKit: kit as unknown as CardKit,
    reader: { header: HEADER },
    clearSelection: vi.fn(),
  };
  return { a: a as unknown as EditorCardApp & typeof a, el, kit, ui };
}

const button = (el: HTMLElement, sel: string) => el.querySelector<HTMLButtonElement>(sel)!;

describe("refreshEditorCard", () => {
  it("does nothing with nothing selected", () => {
    const { a, ui, kit } = app(null);
    refreshEditorCard(a);
    expect(kit.diagnostics.invalidate).not.toHaveBeenCalled();
    expect(ui.renderEditor).not.toHaveBeenCalled();
  });

  it("draws the selected room's card, whose buttons and ✕ reach the UI", () => {
    const u = unitDetail("classic", "office", { id: OFFICE });
    const { a, el, ui, kit } = app({ type: "unit", id: OFFICE }, { unit: u });
    refreshEditorCard(a);
    expect(kit.diagnostics.invalidate).toHaveBeenCalledOnce();
    expect(a.engine.selectedId).toBe(OFFICE);
    // Desktop leaves the diagnostics to the inspector card.
    expect(kit.diagnostics.unit).not.toHaveBeenCalled();
    button(el, '[data-edit="sell"]').click();
    expect(ui.editAction).toHaveBeenLastCalledWith("sell");
    button(el, '.win-title [aria-label="Close"]').click();
    expect(ui.hideEditor).toHaveBeenCalledOnce();
  });

  it("folds the room's diagnostics into its card on a phone", () => {
    const u = unitDetail("classic", "office", { id: OFFICE });
    const { a, el, kit } = app({ type: "unit", id: OFFICE }, { unit: u, mobile: true });
    refreshEditorCard(a, false);
    expect(kit.diagnostics.invalidate).not.toHaveBeenCalled();
    expect(kit.diagnostics.unit).toHaveBeenCalledWith(OFFICE, false);
    expect(el.querySelector(".fold-line")).not.toBeNull();
  });

  it("draws the selected shaft's card, whose buttons and ✕ reach the UI", () => {
    const t = transportDetail("elevatorStandard", 6, { id: SHAFT, cars: 2 });
    const { a, el, ui, kit } = app({ type: "transport", id: SHAFT }, { shaft: t });
    refreshEditorCard(a);
    expect(a.engine.selectedId).toBe(SHAFT);
    expect(kit.diagnostics.transport).not.toHaveBeenCalled();
    button(el, '[data-act="addcar"]').click();
    expect(ui.editAction).toHaveBeenLastCalledWith("addcar");
    button(el, '[data-act="removecar"]').click();
    expect(ui.editAction).toHaveBeenLastCalledWith("removecar");
    button(el, '.win-title [aria-label="Close"]').click();
    expect(ui.hideEditor).toHaveBeenCalledOnce();
  });

  it("folds the shaft's load lines into its card on a phone", () => {
    const t = transportDetail("elevatorStandard", 6, { id: SHAFT });
    const { a, el, kit } = app({ type: "transport", id: SHAFT }, { shaft: t, mobile: true });
    refreshEditorCard(a);
    expect(kit.diagnostics.transport).toHaveBeenCalledWith(SHAFT);
    expect(el.querySelector(".fold-line")).not.toBeNull();
  });

  it("clears the selection when the room or the shaft is gone", () => {
    const room = app({ type: "unit", id: OFFICE });
    refreshEditorCard(room.a);
    expect(room.a.clearSelection).toHaveBeenCalledOnce();
    expect(room.ui.renderEditor).not.toHaveBeenCalled();
    const shaft = app({ type: "transport", id: SHAFT });
    refreshEditorCard(shaft.a);
    expect(shaft.a.clearSelection).toHaveBeenCalledOnce();
    expect(shaft.ui.renderEditor).not.toHaveBeenCalled();
  });
});
