import { html } from "lit-html";
import { renderDetached } from "@verticopolis/components/windows/detached";
import { trackAppAction, trackAppActionOnce } from "../../analyticsActions";
import { browserStorage } from "@verticopolis/components/windows/overviewMapPrefs";
import { PALETTE_COLLAPSE_BUTTON_ID, PALETTE_COLLAPSED_CLASS } from "../paletteCollapse";
import {
  defaultLayout,
  TOOLS_LIMITS,
  TOWER_LIMITS,
  type DeskWindowId,
} from "@verticopolis/components/windows/desk/deskGeometry";
import { ControlPanel } from "@verticopolis/components/windows/desk/deskControlPanel";
import { DeskManager, deskTaskResult, type DeskSlot } from "@verticopolis/components/windows/desk/deskManager";
import {
  deskMode,
  DESK_POCKET_CLASS,
  DESK_TOUCH_CLASS,
  pocketBody,
  type DeskMode,
} from "@verticopolis/components/windows/desk/deskPocket";
import {
  deskScreenOf,
  heedDeskSwitch,
  readDeskSwitch,
  watchDeskScreen,
  type DeskSwitchPlace,
} from "@verticopolis/components/windows/desk/deskScreen";
import { DeskTaskbar, type TaskbarOptions } from "@verticopolis/components/windows/desk/deskTaskbar";
import { DeskTitle, DESK_TITLE_WINDOW } from "@verticopolis/components/windows/desk/deskTitle";
import { buildFrame } from "@verticopolis/components/windows/desk/deskWindow";
import { onMenuItem, runMenuItem, setMenuState, type MenuEntryState } from "../../game/menuBarHost";
import {
  trackDeskClose,
  trackDeskStartOpen,
  trackDeskTask,
  trackDeskTray,
  trackDeskWindow,
  trackWindowMenuOpen,
  trackWindowMenuPick,
  type DeskScreen,
} from "./deskAnalytics";
import { CONTROL_ITEM, CONTROL_ITEMS, CONTROL_PANEL_ITEM, startItems, towerTitleText, towerName } from "./deskGlue";
import { setDeskMenus } from "./deskMenus";

/**
 * The 1994 desk (option C, picked by the owner on 2026-11-15): on a computer,
 * every part of the game is its own window on a teal desktop with a taskbar,
 * the way the 1994 original opened a tower. The tower window holds the menu
 * bar, the tower and the status bar; Info, Tools, the Map, the Bulletin and
 * Tower Info are windows of their own beside it. A sideways tablet gets the
 * same desk with touch chrome; phones and upright tablets get the pocket desk.
 * Small computer windows keep today's layout, and so does the title screen.
 *
 * The windows, the taskbar, the title screen's window and the Control Panel
 * are the components package's (`windows/desk/*`); this file is the game's
 * glue. It moves the game's own elements into the windows and puts them back
 * when the desk goes away, so every id, listener and test that knows them
 * keeps working. There is no player switch (owner, 2026-11-15 and
 * 2026-11-20): `?desk=on`, `?desk=pocket` and `?desk=off` are for testing.
 *
 * Cost: nothing per frame. MutationObservers hear the few elements whose
 * state the game owns (the windows' open state, the tower's name, the
 * sound), and each answer touches the taskbar only.
 */

/** The class on `<body>` while the desk is up. */
export const DESK_CLASS = "desk";
/** The event the desk sends on the document when it comes up or goes away. */
export const DESK_CHANGE_EVENT = "vc-desk-change";
/** Storage keys: the testing switch, the windows' places, the maximized tower. */
export const DESK_KEY = { enabled: "vc-desk", layout: "vc-desk-places", max: "vc-desk-max" } as const;

/** Whether the desk is up now. */
export function deskActive(doc: Document = document): boolean {
  return doc.body.classList.contains(DESK_CLASS);
}

/** The taskbar order: the tower first, then the small windows. */
const ORDER: readonly DeskWindowId[] = ["tower", "info", "tools", "map", "bulletin", "towerInfo", "control"];

/** One element the desk moved, and where it came from. */
interface Moved {
  readonly node: HTMLElement;
  readonly parent: Node;
  readonly next: Node | null;
}

export class DeskController {
  /** The desk showing now, or the one about to come up. */
  private mode: DeskMode = null;
  private readonly place: DeskSwitchPlace = { store: browserStorage(), key: DESK_KEY.enabled };
  private manager: DeskManager | null = null;
  private moved: Moved[] = [];
  private desk: HTMLElement | null = null;
  private taskbar: DeskTaskbar | null = null;
  private control: ControlPanel | null = null;
  private title: DeskTitle | null = null;
  /** Renames the tower window (lit touches its title only when it changed). */
  private setTowerTitle: ((title: string) => void) | null = null;
  private watcher: MutationObserver | null = null;
  private readonly movedOnce = new Set<DeskWindowId>();
  /** The window the player just asked for from the Window menu, which the
   *  desk brings up even on the pocket desk. */
  private asked: DeskWindowId | null = null;

  constructor(private readonly doc: Document = document) {}

  /** Watch for the moments the desk should come or go, and decide now. */
  start(): void {
    heedDeskSwitch(this.doc.location?.href ?? "http://x/", this.place);
    watchDeskScreen(window, () => this.decide());
    // The title screen's class on <body> decides too.
    new MutationObserver(() => this.decide()).observe(this.doc.body, { attributes: true, attributeFilter: ["class"] });
    const sound = this.doc.getElementById(CONTROL_ITEM.sounds);
    if (sound)
      new MutationObserver(() => this.syncSound()).observe(sound, {
        attributes: true,
        attributeFilter: ["aria-checked"],
      });
    this.wireMenuItems();
    this.decide();
  }

  private decide(): void {
    const screen = deskScreenOf(window, readDeskSwitch(this.place));
    const mode = deskMode(screen);
    const splash = this.doc.body.classList.contains("splash-up");
    const want = mode !== null && !splash && !!this.doc.getElementById("stage") ? mode : null;
    // The title screen sits in its own window on the full desk.
    if (mode === "desk" && splash) this.showTitle();
    else this.title?.hide();
    // Turning a tablet can change the desk: the old one goes first.
    if (this.desk && want !== this.mode) this.down();
    this.mode = want;
    if (want && !this.desk) this.up(screen.touch);
  }

  private get pocket(): boolean {
    return this.mode === "pocket";
  }

  private wireMenuItems(): void {
    // Info and Tools are what the player plays with, so on the desk they never
    // close; the Window menu brings every window up (owner, 2026-11-15).
    for (const item of this.doc.querySelectorAll<HTMLElement>("[data-desk-win]")) {
      onMenuItem(item.id, () => this.show(item.dataset.deskWin as DeskWindowId), this.doc);
    }
    // The Window menu opens the Bulletin by running Tower's hidden item: the player asking.
    onMenuItem("mb-win-bulletin", () => this.ask("bulletin"), this.doc);
  }

  /** Mark `id` as asked for until the game's answer to the pick has been heard. */
  private ask(id: DeskWindowId): void {
    this.asked = id;
    this.doc.defaultView?.setTimeout(() => {
      if (this.asked === id) this.asked = null;
    }, 0);
  }

  /** Bring window `id` up: opened the game's own way if it is closed, back
   *  from the taskbar if minimized, and in front. */
  private show(id: DeskWindowId): void {
    // The pocket desk's Map is the game's own card in the tower's view.
    if (this.pocket && id === "map" && this.doc.getElementById("overview-map")?.hidden)
      runMenuItem("mb-win-map", this.doc);
    if (!this.manager?.get(id)) return;
    this.ask(id);
    this.manager.show(id);
  }

  private move(node: HTMLElement | null, into: HTMLElement): void {
    if (!node?.parentNode) return;
    this.moved.push({ node, parent: node.parentNode, next: node.nextSibling });
    into.appendChild(node);
  }

  /** The Verticopolis menu, the tray and the presses both taskbars share. */
  private taskbarCommon(screen: DeskScreen): Omit<TaskbarOptions, "task" | "items"> {
    const doc = this.doc;
    return {
      shown: (id) => id === CONTROL_PANEL_ITEM || doc.getElementById(id)?.hidden !== true,
      start: (itemId) => {
        trackAppAction("desk_start", itemId);
        if (itemId === CONTROL_PANEL_ITEM) this.openControl();
        else doc.getElementById(itemId)?.click();
      },
      sound: () => doc.getElementById(CONTROL_ITEM.sounds)?.click(),
      opened: () => trackDeskStartOpen(screen),
      tray: trackDeskTray,
    };
  }

  /** The title screen in its own window, with a taskbar of its own. */
  private showTitle(): void {
    if (this.title?.up) return;
    if (!this.title) {
      const host = renderDetached(this.doc, html`<div class="desk-title-host"></div>`).elements[0] as HTMLElement;
      this.doc.body.append(host);
      this.title = new DeskTitle({
        host,
        title: "Verticopolis",
        taskbar: {
          ...this.taskbarCommon("title"),
          items: startItems(false),
          // The title screen's window is the only one, and it stays up.
          task: () => {
            trackDeskTask(DESK_TITLE_WINDOW, "front");
            this.doc.querySelector<HTMLElement>("#splash .splash-btn.primary")?.focus();
          },
        },
      });
    }
    this.title.show();
    this.syncSound();
    trackAppActionOnce("desk_title_shown");
  }

  // ---------- up and down ----------

  private up(touch: boolean): void {
    const doc = this.doc;
    const app = doc.getElementById("app");
    if (!app) return;
    const pocket = this.pocket;
    doc.body.classList.add(DESK_CLASS);
    doc.body.classList.toggle(DESK_POCKET_CLASS, pocket);
    doc.body.classList.toggle(DESK_TOUCH_CLASS, pocket || touch);
    // A right-click on a window's title bar opens its window menu, as 1995's did.
    const desk = renderDetached(doc, html`<div id="desk" class="desk-area" @contextmenu=${this.onDeskMenu}></div>`)
      .elements[0] as HTMLElement;
    app.append(desk);
    this.desk = desk;

    // The tower window: the menu bar, the tower and the status bar.
    const tower = buildFrame(doc, "desk-win-tower", towerTitleText(doc), {
      label: "Close the tower",
      onClick: () => {
        trackDeskClose("tower");
        doc.getElementById("mb-close")?.click();
      },
    });
    this.setTowerTitle = tower.setTitle;
    desk.appendChild(tower.root);
    const palette = doc.getElementById("palette");
    const map = doc.getElementById("overview-map");
    // The bar's host lays out as if it were not there, so the bar sits in the
    // tower window as its first row.
    this.move(doc.getElementById("menubar-host"), tower.body);
    if (pocket) {
      // Info, Tools and the tower share the tower window; the Map stays in
      // the tower's view, floating at its phone size.
      const grid = pocketBody(doc);
      tower.body.appendChild(grid);
      for (const id of ["topbar", "palette", "stage"]) this.move(doc.getElementById(id), grid);
    } else this.move(doc.getElementById("stage"), tower.body);
    this.move(doc.getElementById("statusbar"), tower.body);

    // Info: the rating, date, time, funds, people and speed.
    const info = pocket ? null : buildFrame(doc, "desk-win-info", "Info");
    if (info) {
      desk.appendChild(info.root);
      this.move(doc.getElementById("topbar"), info.body);
    }
    // Status Bar and Full Screen join the Window menu while the desk is up.
    const windowMenu = doc.getElementById("mb-window-menu");
    if (windowMenu)
      for (const id of ["mb-win-statusbar", "mb-fullscreen"]) this.move(doc.getElementById(id), windowMenu);
    setDeskMenus(doc, pocket);

    // Tools and the small windows the game already draws.
    const bulletin = doc.getElementById("bulletin-win");
    const towerInfo = doc.getElementById("tower-win");
    for (const el of pocket ? [towerInfo, bulletin] : [palette, map, towerInfo, bulletin]) this.move(el, desk);
    // Tools never folds on the desk: a window folded off the desk opens.
    if (palette?.classList.contains(PALETTE_COLLAPSED_CLASS)) doc.getElementById(PALETTE_COLLAPSE_BUTTON_ID)?.click();

    // The Control Panel: closed until the Verticopolis menu or the tray opens it.
    const control = new ControlPanel(doc, {
      items: CONTROL_ITEMS,
      closeLabel: "Close Control Panel",
      picked: (icon) => {
        trackAppAction("desk_control", icon);
        doc.getElementById(CONTROL_ITEM[icon])?.click();
      },
      closed: () => trackDeskClose("control"),
    });
    desk.appendChild(control.root);
    this.control = control;

    const manager = new DeskManager({
      desk,
      order: ORDER,
      // The full desk opens each window at its saved place or the first
      // layout; the pocket desk leaves the places to its stylesheet.
      places: (w, h) => {
        if (!info) return {};
        // Info's strip takes the width between Tools and the column first, so
        // the tower opens under it at the height the strip really has.
        info.root.style.width = `${defaultLayout(w, h).info.w}px`;
        return defaultLayout(w, h, info.root.offsetHeight || undefined, map?.offsetHeight || undefined);
      },
      memory: pocket ? undefined : { store: this.place.store, layoutKey: DESK_KEY.layout, maxKey: DESK_KEY.max },
      chrome: () => doc.getElementById("menubar"),
      refreshed: (entries) => {
        this.setTowerTitle?.(towerTitleText(doc));
        this.taskbar?.render(entries);
        this.syncMenuChecks();
        this.syncSound();
      },
      tasked: trackDeskTask,
      changed: (id, what) => {
        if (what !== "move" || !this.movedOnce.has(id)) trackDeskWindow(id, what);
        if (what === "move") this.movedOnce.add(id);
      },
    });
    this.manager = manager;

    this.taskbar = new DeskTaskbar(doc, {
      ...this.taskbarCommon("tower"),
      items: startItems(true),
      task: (id) => this.taskPressed(id as DeskWindowId),
      controlPanel: () => this.openControl(),
      windowMenu: manager.windowMenu({
        picked: trackWindowMenuPick,
        opened: (_id, from) => trackWindowMenuOpen(from),
      }),
    });
    app.appendChild(this.taskbar.root);
    this.taskbar.start();

    const item = (id: string) => () => runMenuItem(id, doc);
    const slot = (
      id: DeskWindowId,
      el: HTMLElement,
      label: () => string,
      rest: Partial<DeskSlot> & Pick<DeskSlot, "isOpen">,
    ): DeskSlot => ({ id, el, label, layer: "tool", limits: null, canMax: false, ...rest });
    manager.add(
      slot("tower", tower.root, () => (pocket ? towerName(doc) : towerTitleText(doc)), {
        layer: "app",
        limits: TOWER_LIMITS,
        canMax: true,
        isOpen: () => true,
        close: () => doc.getElementById("mb-close")?.click(),
      }),
    );
    if (info) manager.add(slot("info", info.root, () => "Info", { isOpen: () => true }));
    if (palette && !pocket)
      manager.add(
        slot("tools", palette, () => "Tools", { limits: TOOLS_LIMITS, heightOnly: true, isOpen: () => true }),
      );
    if (map && !pocket)
      manager.add(
        slot("map", map, () => "Map", {
          isOpen: () => !map.hidden,
          open: item("mb-win-map"),
          close: () => map.querySelector<HTMLElement>(".overview-map-close")?.click(),
        }),
      );
    if (bulletin)
      manager.add(
        slot("bulletin", bulletin, () => "Bulletin", {
          isOpen: () => !bulletin.hidden,
          open: item("mb-win-bulletin"),
          close: () => bulletin.querySelector<HTMLElement>('[data-close="bulletin-win"]')?.click(),
        }),
      );
    if (towerInfo)
      manager.add(
        slot("towerInfo", towerInfo, () => "Tower Info", {
          isOpen: () => !towerInfo.hidden,
          open: item("mb-win-tower"),
          close: () => towerInfo.querySelector<HTMLElement>('[data-close="tower-win"]')?.click(),
        }),
      );
    manager.add(
      slot("control", control.root, () => "Control Panel", {
        isOpen: () => control.isOpen(),
        open: () => control.open(),
        close: () => control.close(),
      }),
    );

    // The pocket desk opens with the Map over the tower.
    if (pocket && map?.hidden) item("mb-win-map")();
    manager.start();
    // A Bulletin already open on the pocket desk waits on the taskbar.
    if (pocket && bulletin && !bulletin.hidden) manager.get("bulletin")?.minimize();
    this.watch(palette, bulletin, pocket ? map : null);
    trackAppActionOnce("desk_shown", pocket ? "pocket" : "desk");
    doc.dispatchEvent(new CustomEvent(DESK_CHANGE_EVENT));
  }

  private down(): void {
    this.watcher?.disconnect();
    this.watcher = null;
    this.manager?.dispose();
    this.manager = null;
    this.doc.querySelectorAll(".desk-added").forEach((e) => e.remove());
    for (const { node, parent, next } of this.moved.reverse()) {
      parent.insertBefore(node, next && next.parentNode === parent ? next : null);
    }
    this.moved = [];
    this.taskbar?.stop();
    this.taskbar?.root.remove();
    this.taskbar = null;
    this.control = null;
    this.desk?.remove();
    this.desk = null;
    this.setTowerTitle = null;
    setDeskMenus(this.doc, null);
    this.doc.body.classList.remove(DESK_CLASS, DESK_POCKET_CLASS, DESK_TOUCH_CLASS);
    this.doc.dispatchEvent(new CustomEvent(DESK_CHANGE_EVENT));
  }

  /** A right-click on the desk: on a window's title bar, its window menu. */
  private readonly onDeskMenu = (e: MouseEvent): void => {
    const id = this.manager?.titleBarOf(e.target);
    if (id && this.taskbar?.openWindowMenu(id, e.clientX, e.clientY)) e.preventDefault();
  };

  private openControl(): void {
    this.control?.open();
    this.manager?.bringUp("control");
  }

  private taskPressed(id: DeskWindowId): void {
    const m = this.manager;
    const w = m?.get(id);
    if (!m || !w) return;
    // The pocket tower fills the screen and has no Minimize, so its button only brings it to the front.
    if (this.pocket && id === "tower" && deskTaskResult(w.minimized, w === m.active) === "min") {
      trackDeskTask(id, "front");
      m.focus(w);
    } else m.taskPressed(id);
  }

  /** Check the Window menu's items for the windows that are open. */
  private syncMenuChecks(): void {
    const pocketMap = this.pocket ? this.doc.getElementById("overview-map") : null;
    const checks: Record<string, MenuEntryState> = {};
    for (const item of this.doc.querySelectorAll<HTMLElement>("[data-desk-win]")) {
      const id = item.dataset.deskWin as DeskWindowId;
      const open = pocketMap && id === "map" ? !pocketMap.hidden : !!this.manager?.get(id)?.spec.isOpen();
      checks[item.id] = { checked: open };
    }
    setMenuState(checks, this.doc);
  }

  /** Mirror Options > Sound on the trays' speakers and the Sounds icon. */
  private syncSound(): void {
    const on = this.doc.getElementById(CONTROL_ITEM.sounds)?.getAttribute("aria-checked") !== "false";
    this.taskbar?.setSound(on);
    this.title?.taskbar?.setSound(on);
    this.control?.setLabel("sounds", `Sounds: ${on ? "On" : "Off"}`);
  }

  /** Hear what the manager does not: the tower's name, Tools unfolding, the
   *  pocket desk's Map (the game's own card, for the Window menu's check),
   *  and news the game posts on the pocket desk, which covers the tower, so it
   *  waits on the taskbar until the player asks for it. Created after the
   *  manager starts, so it hears each change after the manager has. */
  private watch(palette: HTMLElement | null, bulletin: HTMLElement | null, pocketMap: HTMLElement | null): void {
    const watcher = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        const unfolded =
          r.oldValue?.includes(PALETTE_COLLAPSED_CLASS) && !el.classList.contains(PALETTE_COLLAPSED_CLASS);
        if (el === palette && unfolded && !this.pocket) this.manager?.bringUp("tools");
        const opened = el === bulletin && r.attributeName === "hidden" && r.oldValue !== null && !el.hidden;
        if (opened && this.pocket && this.asked !== "bulletin") this.manager?.get("bulletin")?.minimize();
      }
      this.asked = null;
      this.manager?.refresh();
    });
    const attrs = { attributes: true, attributeOldValue: true };
    if (palette) watcher.observe(palette, { ...attrs, attributeFilter: ["class"] });
    for (const el of [bulletin, pocketMap]) if (el) watcher.observe(el, { ...attrs, attributeFilter: ["hidden"] });
    const name = this.doc.getElementById("sb-tower");
    if (name) watcher.observe(name, { childList: true, characterData: true, subtree: true });
    this.watcher = watcher;
  }
}

/** Start the desk for this page, once. */
export function wireDesk(doc: Document = document): DeskController | null {
  if (doc.body.dataset.desk) return null;
  doc.body.dataset.desk = "1";
  const desk = new DeskController(doc);
  desk.start();
  return desk;
}
