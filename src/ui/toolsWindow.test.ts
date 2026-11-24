// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { html } from "lit-html";
import type { Catalog } from "@verticopolis/engine/catalog/catalogTypes";
import { catalogFor } from "../tests/catalogFixture";
import { mountPage } from "./testing/litTestUtils";
import {
  buildPalette,
  PALETTE_FOLDED_STORAGE_KEY,
  paletteView,
  relabelPalette,
  scanTools,
  showActiveTool,
} from "./toolsWindow";
import type { Tool, UI } from "./UI";

// The desktop fit reads layout, which happy-dom does not have; the components
// package tests it. Here a spy stands in for the window's refit.
const refit = vi.hoisted(() => vi.fn());
vi.mock("@verticopolis/components/windows/palette/paletteFit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@verticopolis/components/windows/palette/paletteFit")>()),
  PaletteFit: class {
    refit = refit;
  },
}));

/**
 * The game's side of the Tools window: which tools the components package's
 * window shows (from the tower's catalog), which are locked and dimmed, which
 * is picked, and what a press, a hint and a fold do. How the window draws
 * them (the folds, the tab bar, the keys) is the package's and is tested
 * there; these tests read the page the package drew from the game's view.
 */

function stubUI(catalog: Catalog = catalogFor("classic")) {
  mountPage(html`
    <aside id="palette">
      <div id="palette-tabs" role="tablist" aria-label="Build categories"></div>
      <div id="palette-scroll"></div>
    </aside>
    <footer id="statusbar"></footer>
  `);
  const palette = document.getElementById("palette-scroll")!;
  const tabs = document.getElementById("palette-tabs")!;
  const selectTool = vi.fn((tool: Tool) => {
    ui.tool = tool;
    showActiveTool(ui, tool);
  });
  const ui = {
    el: { palette, paletteTabs: tabs },
    selectTool,
    tool: { type: "inspect" },
    paletteCatalog: null,
    cb: { getCatalog: () => catalog },
  } as unknown as UI;
  buildPalette(ui);
  const item = (key: string) =>
    palette.querySelector<HTMLElement>(`.pal-item[data-kind="${key}"], .pal-item[data-tool="${key}"]`);
  return { ui, palette, tabs, selectTool, item };
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  document.body.replaceChildren();
});

describe("the Tools window's tools", () => {
  it("pins Inspect and Bulldoze above the categories, with their icons", () => {
    const { palette } = stubUI();
    const pinned = [...palette.querySelectorAll<HTMLElement>(".pal-pinned .pal-item")];
    expect(pinned.map((p) => p.dataset.tool)).toEqual(["inspect", "bulldoze"]);
    expect(pinned[0].querySelector(".pal-name svg")?.getAttribute("data-icon")).toBe("inspect");
    expect(pinned[0].querySelector(".pal-name")?.textContent?.trim()).toBe("Inspect");
  });

  it("shows each category in the game's order, a facility under its own", () => {
    const { palette, item } = stubUI();
    expect([...palette.querySelectorAll<HTMLElement>(".pal-group")].map((g) => g.dataset.group)).toEqual([
      "Structure",
      "Transport",
      "Commercial",
      "Living",
      "Leisure",
      "Services",
      "Special",
    ]);
    const office = item("office")!;
    expect(office.closest<HTMLElement>(".pal-group")?.dataset.group).toBe("Commercial");
    expect(office.dataset.group).toBe("Commercial");
    expect(office.querySelector(".pal-cost")?.textContent).toMatch(/^\$/);
    expect(office.getAttribute("aria-label")).toBe(`Office, ${office.querySelector(".pal-cost")?.textContent}`);
  });

  it("puts a Modern-only venue under its category's Modern band", () => {
    const view = paletteView(catalogFor("modern"), 5, 1e9, null);
    const commercial = view.groups.find((g) => g.title === "Commercial")!;
    const modern = catalogFor("modern").facilities.filter((f) => f.modernOnly && f.category === "food");
    expect(modern.length).toBeGreaterThan(0);
    for (const f of modern) expect(commercial.tools.find((t) => t.key === f.key)?.modern).toBe(true);
    expect(commercial.tools.find((t) => t.key === "office")?.modern).toBe(false);
  });

  it("reads names and prices from the tower's catalog, and relabels the same buttons for a new one (#921)", () => {
    const base = catalogFor("classic");
    const { ui, item } = stubUI();
    const office = item("office")!;
    relabelPalette(ui, {
      ...base,
      facilities: base.facilities.map((f) => (f.key === "office" ? { ...f, name: "Corner Suite", cost: 77_000 } : f)),
    });
    expect(item("office")).toBe(office);
    expect(office.querySelector(".pal-name")?.textContent).toBe("Corner Suite");
    expect(office.querySelector(".pal-cost")?.textContent).toBe("$77k");
  });

  it("locks and dims nothing before the first status pass, then hides what the star has not reached", () => {
    const { ui, item } = stubUI();
    const later = catalogFor("classic").facilities.find((f) => f.available && f.minStar > 1)!.key;
    expect(item(later)!.classList.contains("locked")).toBe(false);
    expect(item("office")!.classList.contains("unaffordable")).toBe(false);
    expect(scanTools(ui, "classic", 1, 0)).toBe(true);
    expect(item(later)!.classList.contains("locked")).toBe(true);
    expect(item("office")!.classList.contains("unaffordable")).toBe(true);
    // The same star and funds again: no scan.
    expect(scanTools(ui, "classic", 1, 0)).toBe(false);
  });
});

describe("a press, a hint and a fold", () => {
  it("picks a facility's build tool, and a pinned tool by its name", () => {
    const { item, selectTool } = stubUI();
    item("office")!.click();
    expect(selectTool).toHaveBeenLastCalledWith({ type: "build", kind: "office" });
    item("bulldoze")!.click();
    expect(selectTool).toHaveBeenLastCalledWith({ type: "bulldoze" });
  });

  it("lights the picked tool only", () => {
    const { item } = stubUI();
    expect(item("inspect")!.classList.contains("active")).toBe(true);
    item("lobby")!.click();
    expect(item("lobby")!.classList.contains("active")).toBe(true);
    expect(document.querySelectorAll(".pal-item.active")).toHaveLength(1);
  });

  it("names the focused tool and says what it does in the status bar, then gives the box back", () => {
    const { item } = stubUI();
    item("office")!.dispatchEvent(new FocusEvent("focus"));
    const hint = document.getElementById("sb-hint")!;
    expect(hint.textContent).toMatch(/^Office: /);
    expect(hint.hidden).toBe(false);
    item("office")!.dispatchEvent(new FocusEvent("blur"));
    expect(hint.hidden).toBe(true);
  });

  it("keeps the folded categories under the game's key", () => {
    localStorage.setItem(PALETTE_FOLDED_STORAGE_KEY, JSON.stringify(["Transport"]));
    const { palette } = stubUI();
    const section = (title: string) => palette.querySelector<HTMLElement>(`.pal-group[data-group="${title}"]`)!;
    expect(section("Transport").classList.contains("pal-folded")).toBe(true);
    section("Living").querySelector<HTMLElement>(".pal-group-title")!.click();
    expect(JSON.parse(localStorage.getItem(PALETTE_FOLDED_STORAGE_KEY)!)).toEqual(["Living", "Transport"]);
  });

  it("opens a category from its tab, the way Getting Started reveals a tool", () => {
    const { tabs, palette } = stubUI();
    tabs.querySelector<HTMLElement>('.pal-tab[data-group="Commercial"]')!.click();
    expect(palette.querySelector(".pal-group.tab-active")?.getAttribute("data-group")).toBe("Commercial");
  });
});

describe("the desktop fit", () => {
  const withoutOffice = (c: Catalog): Catalog => ({
    ...c,
    facilities: c.facilities.map((f) => (f.key === "office" ? { ...f, available: false } : f)),
  });

  it("refits when a scan shows or hides a tool, and not when only the dimming moves", () => {
    const { ui, item } = stubUI(catalogFor("modern"));
    refit.mockClear();
    scanTools(ui, "modern", 1, 1e9);
    expect(item("foodHall")!.classList.contains("locked")).toBe(true);
    expect(refit).toHaveBeenCalledTimes(1);
    scanTools(ui, "modern", 1, 0);
    expect(item("office")!.classList.contains("unaffordable")).toBe(true);
    expect(refit).toHaveBeenCalledTimes(1);
    scanTools(ui, "modern", 5, 0);
    expect(item("foodHall")!.classList.contains("locked")).toBe(false);
    expect(refit).toHaveBeenCalledTimes(2);
  });

  it("refits when a new catalog shows or hides a tool at the same star and funds, and not otherwise", () => {
    const modern = catalogFor("modern");
    const { ui, item } = stubUI(modern);
    scanTools(ui, "modern", 1, 1e9);
    refit.mockClear();
    relabelPalette(ui, withoutOffice(modern));
    expect(item("office")!.classList.contains("locked")).toBe(true);
    expect(refit).toHaveBeenCalledTimes(1);
    // The scan that follows at the same star and funds finds nothing new to fit.
    scanTools(ui, "modern", 1, 1e9);
    expect(refit).toHaveBeenCalledTimes(1);
    relabelPalette(ui, withoutOffice(modern));
    expect(refit).toHaveBeenCalledTimes(1);
  });
});
