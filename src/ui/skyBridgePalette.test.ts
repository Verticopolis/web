import { describe, expect, it, vi } from "vitest";
import { catalogFor } from "../tests/catalogFixture";
import { renderToFragment, mountPage } from "./testing/litTestUtils";
import { buildPalette, scanTools } from "./toolsWindow";
import { skyBridgeToolInfo, skyBridgeUnlocked } from "./skyBridgePalette";
import type { UI } from "./UI";
import { html } from "lit-html";

/**
 * The Sky Bridge tool's Tools window button and card (Modern): built only from a
 * catalog that publishes the rule, hidden below its star, dimmed while one tile
 * is past the funds. The rule's values come from the engine's catalog.
 */

const MODERN = catalogFor("modern");
const RULE = MODERN.rules.skyBridge!;

function palette(mode: "classic" | "modern") {
  mountPage(html`<div id="palette-scroll"></div>`);
  const el = document.getElementById("palette-scroll")!;
  const selectTool = vi.fn();
  const ui = {
    el: { palette: el, paletteTabs: null },
    selectTool,
    tool: { type: "inspect" },
    cb: { getCatalog: () => catalogFor(mode) },
  } as unknown as UI;
  buildPalette(ui);
  return { ui, selectTool, button: () => el.querySelector<HTMLElement>('.pal-item[data-tool="skyBridge"]') };
}

describe("the Sky Bridge button", () => {
  it("is in Structure's Modern band on a Modern tower, with its price per tile", () => {
    const button = palette("modern").button();
    expect(button).not.toBeNull();
    expect(button!.closest(".pal-group")?.getAttribute("data-group")).toBe("Structure");
    expect(button!.classList.contains("pal-mod")).toBe(true);
    expect(button!.querySelector(".pal-name")?.textContent).toBe("Sky Bridge");
    expect(button!.querySelector(".pal-cost")?.textContent).toBe("$11k/tile");
    expect(button!.getAttribute("aria-label")).toBe("Sky Bridge, $11,000 a tile");
  });

  it("is not built on a Classic tower", () => {
    expect(catalogFor("classic").rules.skyBridge).toBeNull();
    expect(palette("classic").button()).toBeNull();
  });

  it("picks the Sky Bridge tool", () => {
    const { button, selectTool } = palette("modern");
    button()!.click();
    expect(selectTool).toHaveBeenCalledExactlyOnceWith({ type: "skyBridge" });
  });
});

describe("the lock scan", () => {
  it("opens at the rule's star", () => {
    expect(RULE.minStar).toBe(3);
    expect(skyBridgeUnlocked(RULE, 2)).toBe(false);
    expect(skyBridgeUnlocked(RULE, 3)).toBe(true);
    expect(skyBridgeUnlocked(null, 5)).toBe(false);
  });

  it("hides the button below the star and dims it when a tile is past the funds", () => {
    const { ui, button } = palette("modern");
    scanTools(ui, "modern", 2, 1_000_000);
    expect(button()!.classList.contains("locked")).toBe(true);
    scanTools(ui, "modern", 3, RULE.tileCost - 1);
    expect(button()!.classList.contains("locked")).toBe(false);
    expect(button()!.classList.contains("unaffordable")).toBe(true);
    scanTools(ui, "modern", 3, RULE.tileCost);
    expect(button()!.classList.contains("unaffordable")).toBe(false);
  });
});

describe("the tool's card", () => {
  it("names the tool, its tile price and the longest bridge", () => {
    const text = renderToFragment(skyBridgeToolInfo(RULE)).textContent ?? "";
    expect(text).toContain("Sky Bridge");
    expect(text).toContain(`Cost: $11,000 per tile, up to ${RULE.maxSpan} tiles`);
    expect(text).toContain("The ghost shows the whole bridge and its price before you click.");
  });
});
