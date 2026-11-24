import { onMenuItem, setMenuState, type MenuEntryState } from "../../game/menuBarHost";

/** Tower's window items and their separator: the desk's Window menu brings those windows up (owner, 2026-11-21). */
const TOWER_WINDOW_ITEMS = ["mb-win-tower", "mb-win-map", "mb-win-bulletin", "mb-tower-win-sep"];
/** Info and Tools: always in the pocket tower window, so its Window menu leaves them out. */
const POCKET_LEFT_OUT = ["mb-dw-info", "mb-dw-tools"];
/** Options > Control Panel… and the line above it, which only the desk shows. */
const OPTIONS_CONTROL_PANEL = "mb-control-panel";
const OPTIONS_CONTROL_SEP = "mb-control-sep";
/** What the Control Panel owns on the desk (its Display and Appearance icons),
 *  and the line above Options' display toggles, whose items all leave
 *  Options on the desk. */
const OPTIONS_LEFT_OUT = ["mb-screensaver", "mb-appearance", "mb-display-sep"];

/**
 * Options while the desk is up (`desk` true) or down: one home per command
 * (owner, #2600). On the desk Options keeps the game's own Settings… and
 * Sound and opens the Control Panel for the rest; with no desk, and so no
 * Control Panel, it has them all. menuWiring.ts applies the desk's states
 * again each time Options opens, after the Full Screen item's.
 */
export function deskOptionStates(desk: boolean): Record<string, MenuEntryState> {
  const states: Record<string, MenuEntryState> = {};
  for (const id of OPTIONS_LEFT_OUT) states[id] = { hidden: desk };
  for (const id of [OPTIONS_CONTROL_SEP, OPTIONS_CONTROL_PANEL]) states[id] = { hidden: !desk };
  return states;
}

/**
 * Show or hide the menu items the desk leaves out, through the menu bar's
 * model. `pocket` is the desk that came up (true for the pocket desk), or
 * `null` when the desk goes down and every item comes back.
 */
export function setDeskMenus(doc: Document, pocket: boolean | null): void {
  const changes: Record<string, MenuEntryState> = deskOptionStates(pocket !== null);
  for (const id of TOWER_WINDOW_ITEMS) changes[id] = { hidden: pocket !== null };
  for (const id of POCKET_LEFT_OUT) changes[id] = { hidden: pocket === true };
  setMenuState(changes, doc);
}

/** Options > Control Panel… runs `open`, then puts the keyboard on the
 *  panel's first icon: a keyboard route to Display and Appearance (High
 *  Contrast) from the menu bar. */
export function wireOptionsControlPanel(doc: Document, open: () => void): void {
  onMenuItem(
    OPTIONS_CONTROL_PANEL,
    () => {
      open();
      doc.querySelector<HTMLElement>("#desk-win-control [data-control]")?.focus();
    },
    doc,
  );
}
