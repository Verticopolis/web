import type { TemplateResult } from "lit-html";
import { catalogFacility } from "@verticopolis/components/render/catalogIndex";
import { transportCardTemplate, unitCardTemplate } from "@verticopolis/components/windows/inspectCard";
import {
  InspectController,
  type InspectAnchor,
  type InspectShown,
  type InspectTarget,
} from "@verticopolis/components/windows/inspectPanel";
import { clockOf } from "../engineHost/headerClock";
import type { ViewReader } from "@verticopolis/engine/port/viewReader";
import type { CardKit } from "./cardKit";
import type { UI } from "../ui/UI";

/**
 * The hover inspector card, as the game feeds it: the components draw the
 * card and keep its ✕ latch (`windows/inspectCard`, `windows/inspectPanel`),
 * and this module hands them the engine's facts for a facility and the
 * problem lines the card kit words from the port's reads.
 *
 * Each pick asks the port for the facility's card (one `unitCard` or
 * `shaftCard`, the shaft's kept per revision and hour) and keeps nothing of
 * the tower: the kit is read per call, so an adoptSim() swap is picked up.
 */
export interface InspectorDeps {
  /** The cards and the reads the port lacks (read per call). */
  kit(): CardKit;
  /** The view, for the clock. */
  reader(): Pick<ViewReader, "header">;
  /** Shows a card body in `#inspector` (or hides it), and takes the card's
   *  ✕ (`cb.onInspectorClose`, which dismisses it and latches it closed). */
  ui: Pick<UI, "showInspector"> & { readonly cb: Pick<UI["cb"], "onInspectorClose"> };
  /** World cell the card describes (GameApp anchors the panel to it each frame). */
  setAnchor(anchor: InspectAnchor | null): void;
}

/** The card for a facility, or null when it is gone. `fresh` is a new
 *  facility under the card, which the problem lines read in full. */
export function inspectCard(deps: InspectorDeps, target: InspectTarget, fresh: boolean): InspectShown | null {
  const kit = deps.kit();
  const opts = { close: () => deps.ui.cb.onInspectorClose() };
  if (target.type === "unit") {
    const u = kit.cards.unit(target.id);
    if (!u) return null;
    const floors = catalogFacility(kit.catalog(), u.kind).floors;
    return {
      anchor: { x: u.x + u.width, left: u.x, floor: u.floor + floors - 1 },
      body: unitCardTemplate(
        u,
        kit.catalog(),
        clockOf(deps.reader().header).hour,
        kit.diagnostics.unit(u.id, fresh),
        opts,
      ),
    };
  }
  const t = kit.cards.shaft(target.id);
  if (!t) return null;
  return {
    anchor: { x: t.x + t.width, left: t.x, floor: t.top },
    body: transportCardTemplate(t, kit.catalog(), kit.diagnostics.transport(t.id), opts),
  };
}

/** The game's inspector: the components' controller over the engine's cards. */
export function createInspector(deps: InspectorDeps): InspectController {
  return new InspectController({
    card: (target, fresh) => inspectCard(deps, target, fresh),
    show: (body: TemplateResult | null) => deps.ui.showInspector(body),
    setAnchor: (anchor) => deps.setAnchor(anchor),
  });
}
