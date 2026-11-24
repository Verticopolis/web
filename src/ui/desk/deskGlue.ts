import type { ControlIcon, ControlItem } from "@verticopolis/components/windows/desk/deskControlPanel";
import type { StartItem } from "@verticopolis/components/windows/desk/deskTaskbar";

/**
 * What the game puts on the 1994 desk the components package draws: the
 * Start menu's items, the Control Panel's icons and the game menu item
 * each runs, and the tower window's name.
 *
 * Cost: nothing runs per frame; the names are read when the taskbar redraws.
 */

/** The Start menu's Control Panel item, which the desk opens itself. */
export const CONTROL_PANEL_ITEM = "desk-control-panel";

/** The Start menu: each item runs the game's menu item with its id,
 *  so it does exactly what its menu twin does. A null is a separator. It
 *  holds no command another menu holds: the manual and About live in Help,
 *  Settings in Options, the screen saver in the Control Panel (#2600). */
const START_ITEMS: readonly (StartItem | null)[] = [
  { id: "btn-new", label: "New…" },
  { id: "mb-import", label: "Open…" },
  null,
  { id: CONTROL_PANEL_ITEM, label: "Control Panel…" },
  null,
  { id: "mb-close", label: "Close Verticopolis" },
];

/** The menu's items; the title screen has no Control Panel. */
export function startItems(controlPanel: boolean): (StartItem | null)[] {
  return START_ITEMS.filter((i) => controlPanel || i?.id !== CONTROL_PANEL_ITEM);
}

/** The game menu item each Control Panel icon runs: Display opens the Screen
 *  Saver dialog, Appearance the Appearance dialog, Sounds turns the sound on
 *  or off, Settings opens the game's Settings. */
export const CONTROL_ITEM: Record<ControlIcon, string> = {
  display: "mb-screensaver",
  appearance: "mb-appearance",
  sounds: "mb-sound",
  settings: "btn-settings",
};

/** The Control Panel's icons, in the order they sit. */
export const CONTROL_ITEMS: readonly ControlItem[] = [
  { icon: "display", label: "Display", hint: "Screen saver" },
  { icon: "appearance", label: "Appearance", hint: "Windows, menus and buttons" },
  { icon: "sounds", label: "Sounds", hint: "Sound on or off" },
  { icon: "settings", label: "Settings", hint: "Game settings" },
];

/** The tower's name from the status bar ("Tower One · Classic"). */
export function towerName(doc: Document): string {
  const text = doc.getElementById("sb-tower")?.textContent ?? "";
  return text.split(" · ")[0]?.trim() || "Verticopolis";
}

/** The tower window's title, in the period's "Document - Program" form. */
export function towerTitleText(doc: Document): string {
  const name = towerName(doc);
  return name === "Verticopolis" ? name : `${name} - Verticopolis`;
}
