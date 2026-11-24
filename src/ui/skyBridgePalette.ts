import { html, nothing, type TemplateResult } from "lit-html";
import type { CatalogSkyBridge } from "@verticopolis/engine/catalog/skyBridgeTypes";
import { groupDigits } from "@verticopolis/components/windows/format";

/**
 * The Sky Bridge tool's rule and card (Modern; party, 2026-11-16). Its
 * button sits in Structure's Modern sub-band of the Tools window
 * (`toolsWindow.ts`), only where the catalog publishes a `rules.skyBridge`
 * rule (Modern), so a Classic window never shows it. Like a facility button
 * it is hidden until the tower reaches the rule's star and dimmed while the
 * funds cannot pay for one tile.
 */

/** The button's `data-tool` and the tool's `type`. */
export const SKY_BRIDGE_TOOL = "skyBridge";

/** What the tool does, for the button's description and its card. */
export const SKY_BRIDGE_DESCRIPTION =
  "Click the open air between two towers' sky lobbies to build the whole bridge at once. Click a bridge to give it the look picked on the strip, free.";

/** Whether the tool is open: the mode builds bridges and the tower has the
 *  rule's stars. */
export function skyBridgeUnlocked(rule: CatalogSkyBridge | null, star: number): boolean {
  return rule !== null && star >= rule.minStar;
}

/** The tool's card: what a click does, the price of a tile and the longest
 *  bridge. The ghost tags the whole bridge's price before the click. */
export function skyBridgeToolInfo(rule: CatalogSkyBridge | null): TemplateResult {
  const price = rule
    ? html`<div>Cost: $${groupDigits(rule.tileCost)} per tile, up to ${rule.maxSpan} tiles</div>`
    : nothing;
  return html`<div class="ti-name">Sky Bridge</div>${price}<p style="margin-top:6px;color:var(--muted)">${SKY_BRIDGE_DESCRIPTION} The ghost shows the whole bridge and its price before you click.</p>`;
}
