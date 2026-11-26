import type { UI } from "../ui/UI";
import { unitEditorTemplate } from "../ui/templates/editor";
import { shaftEditorTemplate, type ShaftEditAction } from "@verticopolis/components/windows/shaftEditor";
import { catalogFacility } from "@verticopolis/components/render/catalogIndex";
import { clockOf } from "../engineHost/headerClock";
import { isBasementFloor } from "../ui/floorLabel";
import type { ViewReader } from "@verticopolis/engine/port/viewReader";
import type { TransportDetail } from "@verticopolis/engine/port/panels";
import type { Catalog } from "@verticopolis/engine/catalog/catalogTypes";
import type { TemplateResult } from "lit-html";
import type { CardKit } from "./cardKit";

/** Every button the shaft's card can carry: the web game offers them all. */
const SHAFT_OFFERS: ReadonlySet<ShaftEditAction> = new Set<ShaftEditAction>([
  "removecar",
  "addcar",
  "schedule",
  "extendDown",
  "extendUp",
  "sell",
]);

/** A shaft keeps at least one car, so – Car is off at one. */
const AT_FEWEST_CARS: ReadonlySet<ShaftEditAction> = new Set<ShaftEditAction>(["removecar"]);

/** The elevator's stops line. An express stops at the lobbies and at every
 *  basement floor it passes (1994 parity), so it reads a fixed policy,
 *  counting any of those turned off (a basement stop the player turned off,
 *  or a lobby a legacy save skipped) so the line never overstates. Other
 *  elevators count the floors they skip. */
export function shaftStopsText(t: Pick<TransportDetail, "kind" | "stops">): string {
  if (t.kind === "elevatorExpress") {
    const policy = t.stops.some((row) => isBasementFloor(row.floor))
      ? "lobbies and basements"
      : "lobbies and sky lobbies";
    const skipped = t.stops.filter((row) => !row.served && (row.lobby || isBasementFloor(row.floor))).length;
    return skipped ? `${policy} (${skipped} skipped)` : policy;
  }
  const skipped = t.stops.filter((row) => !row.served).length;
  return skipped ? `skips ${skipped} floor${skipped === 1 ? "" : "s"}` : "all floors";
}

/** The shaft's editor card as the web game draws it: every button, the
 *  catalog's resale value, the stops line, and the problem lines it is given
 *  (the mobile card folds them in). */
export function webShaftEditorTemplate(
  t: TransportDetail,
  catalog: Catalog,
  ui: Pick<UI, "hideEditor" | "editAction">,
  lines: readonly TemplateResult[],
): TemplateResult {
  return shaftEditorTemplate(t, catalog, {
    offers: SHAFT_OFFERS,
    disabled: t.cars <= 1 ? AT_FEWEST_CARS : undefined,
    stops: shaftStopsText(t),
    act: (action) => ui.editAction(action),
    close: () => ui.hideEditor(),
    resale: catalogFacility(catalog, t.kind).resaleRefund,
    lines,
  });
}

/** What {@link refreshEditorCard} reads off the app. */
export interface EditorCardApp {
  readonly selected: { type: "unit" | "transport"; id: number } | null;
  readonly engine: { selectedId: number | null };
  readonly ui: Pick<UI, "renderEditor" | "hideEditor" | "editAction">;
  readonly mobileMq: { readonly matches: boolean };
  readonly cardKit: CardKit;
  readonly reader: Pick<ViewReader, "header">;
  clearSelection(): void;
}

/**
 * Render the selected facility's editor card from the port's card for it. The
 * template is a pure function of (card, catalog, hour, mobile); lit's binding
 * diff patches only the values that changed since the last pump, so the
 * buttons and rename input keep their identity across stat ticks, and a shape
 * change (a condo sells and loses its price adjuster, a cinema finishes
 * construction and gains its "Now showing" row, the viewport crosses the
 * mobile breakpoint) restructures just the affected rows. Mobile folds the
 * inspector card's diagnostics into the editor (one panel, no hover). A card
 * the port no longer has means the facility is gone, so the selection clears.
 */
export function refreshEditorCard(app: EditorCardApp, freshDiagnostics = true): void {
  const sel = app.selected;
  if (!sel) return;
  const mobile = app.mobileMq.matches;
  const kit = app.cardKit;
  // Commands can change another room without changing the selected card.
  // Invalidate even on desktop, where diagnostics are shown by the inspector.
  if (freshDiagnostics) kit.diagnostics.invalidate();
  if (sel.type === "unit") {
    const u = kit.cards.unit(sel.id);
    if (!u) return app.clearSelection();
    app.engine.selectedId = u.id;
    const diag = mobile ? kit.diagnostics.unit(u.id, freshDiagnostics) : [];
    const header = app.reader.header;
    app.ui.renderEditor(
      unitEditorTemplate(u, kit.catalog(), clockOf(header).hour, {
        act: (action) => app.ui.editAction(action),
        close: () => app.ui.hideEditor(),
        mobile,
        diag,
        calendar: header.modernCalendar,
      }),
    );
  } else {
    const t = kit.cards.shaft(sel.id);
    if (!t) return app.clearSelection();
    app.engine.selectedId = t.id; // outlines the shaft + shows extend arrows
    app.ui.renderEditor(
      webShaftEditorTemplate(t, kit.catalog(), app.ui, mobile ? kit.diagnostics.transport(t.id) : []),
    );
  }
}
