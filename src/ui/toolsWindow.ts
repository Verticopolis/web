import type { Catalog } from "@verticopolis/engine/catalog/catalogTypes";
import type { FacilityCategory } from "@verticopolis/engine/model/types";
import { facilityColor, facilityDescription } from "@verticopolis/components/presentation/facilityPresentation";
import { groupDigits, shortMoney } from "@verticopolis/components/windows/format";
import {
  ToolPalette,
  type PaletteGroup,
  type PaletteTool,
  type PaletteView,
} from "@verticopolis/components/windows/palette/toolPalette";
import type { Tool, UI } from "./UI";
import { PaletteFit } from "@verticopolis/components/windows/palette/paletteFit";
import { PaletteCollapse } from "@verticopolis/components/windows/palette/paletteCollapse";
import { browserStorage } from "@verticopolis/components/windows/overviewMapPrefs";
import { showHintInStatusBar } from "./statusBar";
import { TOOL_DESCRIPTION } from "./templates/toolInfo";
import { SKY_BRIDGE_DESCRIPTION, SKY_BRIDGE_TOOL, skyBridgeUnlocked } from "./skyBridgePalette";

/**
 * The game's side of the Tools window. The components package's
 * {@link ToolPalette} draws the window's list and its phone tab bar into the
 * page's `#palette-scroll` and `#palette-tabs`; this module tells it which
 * tools there are (from the tower's catalog), which the tower has unlocked
 * and the funds can reach, and which is picked, and answers a pick, a hint
 * and a fold.
 *
 * The categories are the game's: Structure, Transport, Commercial, Living,
 * Leisure, Services and Special, with Inspect and Bulldoze pinned above them.
 * A kind the catalog marks Modern-only sits under its category's "Modern"
 * sub-band, and so does the Sky Bridge tool, in Structure, where the catalog
 * has a bridge rule. A locked tool is hidden, as in the 1994 game; one the
 * funds cannot reach is dimmed.
 *
 * Cost: the status pass calls {@link scanTools} several times a second. It
 * builds a short key over engine data (the mode, the star, and which prices
 * the funds reach) and updates the window only when the key changed, which
 * is at a star, an affordability crossing or a new catalog.
 */

const GROUPS: { title: string; cats: FacilityCategory[] }[] = [
  { title: "Structure", cats: ["structure"] },
  { title: "Transport", cats: ["transport"] },
  { title: "Commercial", cats: ["office", "retail", "food"] },
  { title: "Living", cats: ["residential", "hotel"] },
  { title: "Leisure", cats: ["entertainment"] },
  { title: "Services", cats: ["service"] },
  { title: "Special", cats: ["special"] },
];

/** Where the folded categories are kept. */
export const PALETTE_FOLDED_STORAGE_KEY = "vc-tools-folded-groups";

/** Where the CSS shows the category tabs (`media-phone.css`), the same query
 *  as `Game.mobileMq` in `main.ts`. Only there are the sections tab panels. */
const TAB_LAYOUT_MQ = "(max-width: 767px), (max-width: 1023px) and (max-height: 599px)";

/** Where the tabs are one row that scrolls sideways. */
const ONE_ROW_TAB_LAYOUT_MQ =
  "(max-width: 1023px) and (max-height: 339.98px) and (orientation: landscape), (max-width: 539.98px) and (orientation: landscape)";

/** What the window was last told, and the key it was drawn from. */
interface ToolsState {
  readonly palette: ToolPalette;
  refit: () => void;
  catalog: Catalog;
  /** The tower's star, or null before the first status pass: nothing locked. */
  star: number | null;
  money: number;
  active: string | null;
  scanKey: string | null;
}

const states = new WeakMap<UI, ToolsState>();

/** Where the player's fold of the desktop Tools window is kept. */
export const PALETTE_COLLAPSED_STORAGE_KEY = "vc-tools-collapsed-desktop";

/** Each Tools window's fold button, for {@link openFoldedToolsAround}. */
const collapses = new WeakMap<Element, PaletteCollapse>();

/** The Tools window (`#palette`), the window around the list. */
export function paletteWindow(ui: UI): HTMLElement | null {
  return ui.el.palette.closest<HTMLElement>("#palette");
}

const media = (query: string): MediaQueryList | null =>
  typeof window.matchMedia === "function" ? window.matchMedia(query) : null;

/** Draw the Tools window for `ui`, once, from its catalog. Every tool shows
 *  until the first status pass says which are locked. */
export function buildPalette(ui: UI): void {
  const storage = browserStorage();
  const win = paletteWindow(ui);
  // On the desktop layout the window picks compact rows or two columns when
  // the list would not fit (PaletteFit); a fold or a tool shown or hidden
  // refits it. Its title bar's button folds the window into a strip.
  const fit = win ? new PaletteFit(win) : null;
  const refit = (): void => void fit?.refit();
  const palette = new ToolPalette({
    list: ui.el.palette,
    tabs: ui.el.paletteTabs,
    pinnedTitle: "Tools",
    pick: (tool) => ui.selectTool(toolFor(tool)),
    hint: (tool) => showHintInStatusBar(tool ? `${tool.name}: ${tool.description}` : ""),
    folded: () => states.get(ui)?.refit(),
    foldStore: { key: PALETTE_FOLDED_STORAGE_KEY, storage },
    tabMedia: media(TAB_LAYOUT_MQ),
    stripMedia: media(ONE_ROW_TAB_LAYOUT_MQ),
  });
  const catalog = ui.cb.getCatalog();
  ui.paletteCatalog = catalog;
  states.set(ui, { palette, refit, catalog, star: null, money: 0, active: activeKey(ui.tool), scanKey: null });
  draw(ui);
  if (win) wireToolsCollapse(win, storage, refit);
}

/** Draw the fold button on the Tools window `win`, start the window as the
 *  player last left it, and call `toggled` after each fold or open. */
export function wireToolsCollapse(
  win: HTMLElement,
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  toggled: () => void,
): PaletteCollapse {
  const collapse = new PaletteCollapse(win, { store: { key: PALETTE_COLLAPSED_STORAGE_KEY, storage }, toggled });
  collapses.set(win, collapse);
  return collapse;
}

/** Open the Tools window when `tool` sits in it while it is folded, so a
 *  Getting Started pointer at the tool is in view (desktop layout only). */
export function openFoldedToolsAround(tool: Element): void {
  const win = tool.closest("#palette");
  if (win) collapses.get(win)?.openAround(tool);
}

/** The game's tool for a pressed button. */
function toolFor(tool: PaletteTool): Tool {
  return tool.attr === "kind" ? ({ type: "build", kind: tool.key } as Tool) : ({ type: tool.key } as Tool);
}

/** The button key of the tool `tool`. */
function activeKey(tool: Tool): string {
  return tool.type === "build" ? tool.kind : tool.type;
}

/** Light the picked tool's button. */
export function showActiveTool(ui: UI, tool: Tool): void {
  const state = states.get(ui);
  if (!state) return;
  const key = activeKey(tool);
  if (state.active === key) return;
  state.active = key;
  draw(ui);
}

/** The window's names and prices for `catalog`: the status pass calls this
 *  when the tower's catalog changes (a host attached or let go, or a tower
 *  swapped in), so the window never shows another engine's values (#921).
 *  Each tool keeps its button, and the next scan rewrites the locks. */
export function relabelPalette(ui: UI, catalog: Catalog): void {
  ui.paletteCatalog = catalog;
  const state = states.get(ui);
  if (!state) return;
  state.catalog = catalog;
  state.scanKey = null;
  // The next scan finds the shown tools already drawn, so a refit is due now.
  if (draw(ui)) state.refit();
}

/** The status pass's lock scan: when the mode, the star or what the funds
 *  reach changed since the last scan, show the tools as they stand, and
 *  refit the window when a tool came into view or left it. Answers whether
 *  it scanned. */
export function scanTools(ui: UI, mode: string, star: number, money: number): boolean {
  const state = states.get(ui);
  if (!state) return false;
  const catalog = state.catalog;
  let key = mode + ":" + star;
  for (const f of catalog.facilities) key += money >= f.cost ? "1" : "0";
  const bridge = catalog.rules.skyBridge;
  if (bridge) key += money >= bridge.tileCost ? "b" : "-";
  if (key === state.scanKey) return false;
  state.scanKey = key;
  state.star = star;
  state.money = money;
  if (draw(ui)) state.refit();
  return true;
}

/** Update the window from the state. Answers whether a tool came into view
 *  or left it. */
function draw(ui: UI): boolean {
  const state = states.get(ui)!;
  return state.palette.update(paletteView(state.catalog, state.star, state.money, state.active));
}

/** The pinned tools. */
const PINNED: readonly PaletteTool[] = [
  {
    key: "inspect",
    attr: "tool",
    name: "Inspect",
    color: "#9aa6bd",
    icon: "inspect",
    description: TOOL_DESCRIPTION.inspect,
    label: "Inspect",
  },
  {
    key: "bulldoze",
    attr: "tool",
    name: "Bulldoze",
    color: "#ff6b6b",
    icon: "bulldoze",
    description: TOOL_DESCRIPTION.bulldoze,
    label: "Bulldoze",
  },
];

/**
 * The window's tools under `catalog`, for a tower at `star` with `money` in
 * hand (a null star locks and dims nothing), with `active` picked. The catalog lists
 * every kind in the engine's order, both modes' kinds included, and a kind
 * the tower's mode does not offer reads as not `available`, so it is locked.
 */
export function paletteView(catalog: Catalog, star: number | null, money: number, active: string | null): PaletteView {
  const groups: PaletteGroup[] = GROUPS.map((group) => {
    const tools: PaletteTool[] = [];
    for (const f of catalog.facilities) {
      if (!group.cats.includes(f.category)) continue;
      const cost = `$${shortMoney(f.cost)}`;
      tools.push({
        key: f.key,
        attr: "kind",
        name: f.name,
        cost,
        color: facilityColor(f.key),
        description: facilityDescription(f.key, catalog.world),
        label: `${f.name}, ${cost}`,
        modern: f.modernOnly,
        locked: star !== null && !(f.available && star >= f.minStar),
        unaffordable: star !== null && money < f.cost,
      });
    }
    const bridge = group.title === "Structure" ? catalog.rules.skyBridge : null;
    if (bridge)
      tools.push({
        key: SKY_BRIDGE_TOOL,
        attr: "tool",
        name: "Sky Bridge",
        cost: `$${shortMoney(bridge.tileCost)}/tile`,
        color: facilityColor("lobby"),
        description: SKY_BRIDGE_DESCRIPTION,
        label: `Sky Bridge, $${groupDigits(bridge.tileCost)} a tile`,
        modern: true,
        locked: star !== null && !skyBridgeUnlocked(bridge, star),
        unaffordable: star !== null && money < bridge.tileCost,
      });
    return { title: group.title, tools };
  });
  return { pinned: PINNED, groups, active };
}
