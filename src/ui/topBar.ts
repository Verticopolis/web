import { render } from "lit-html";
import {
  topBarTemplate,
  type TopBarActions,
  type TopBarView,
  type TrafficReadout,
} from "@verticopolis/components/windows/bars/topBar";

/**
 * The game's side of the Information bar. The components package draws it
 * ({@link topBarTemplate}) into the page's `<header id="topbar">`; this module
 * keeps what the bar shows and who answers each of its controls, one record
 * per bar element, so the desk can move the element between windows and a
 * test page gets a bar of its own.
 *
 * Every writer changes only the fields it owns ({@link patchTopBar}): the
 * status pass the meters and Undo and Redo, the traffic refresh the traffic
 * meter, the speed setter the speed, the sound toggle the speaker, and the
 * update and install offers their chips. A patch that changes nothing draws
 * nothing, and a draw writes only the values lit sees change.
 */

/** A control of the bar that some part of the game answers. */
export type TopBarAction = keyof TopBarActions;

/** The traffic meter before the first refresh. */
const SMOOTH: TrafficReadout = { level: "smooth", word: "Smooth", floor: "", spoken: "Traffic: Smooth", warn: false };

/** What the bar shows before the first status pass: a new tower's start. */
export const FIRST_TOP_BAR: TopBarView = {
  rating: "★",
  date: "1st WD/1Q/1st Year",
  time: "Mon 07:00",
  funds: "$2,000,000",
  fundsNegative: false,
  population: "0",
  traffic: SMOOTH,
  speed: 1,
  undoOff: false,
  redoOff: false,
  muted: false,
  update: false,
  install: false,
};

interface Bar {
  view: TopBarView;
  on: Partial<TopBarActions>;
  /** One object for the bar's life, so lit never rebinds a listener. */
  actions: TopBarActions;
}

const bars = new WeakMap<Element, Bar>();

function barOf(doc: Document): { el: HTMLElement; bar: Bar } | null {
  const el = doc.getElementById("topbar");
  if (!el) return null;
  let bar = bars.get(el);
  if (!bar) {
    const on: Partial<TopBarActions> = {};
    bar = {
      view: FIRST_TOP_BAR,
      on,
      actions: {
        speed: (level) => on.speed?.(level),
        undo: () => on.undo?.(),
        redo: () => on.redo?.(),
        save: () => on.save?.(),
        mute: () => on.mute?.(),
        update: () => on.update?.(),
        install: () => on.install?.(),
        traffic: () => on.traffic?.(),
      },
    };
    bars.set(el, bar);
  }
  return { el, bar };
}

function draw(el: HTMLElement, bar: Bar): void {
  render(topBarTemplate(bar.view, bar.actions), el);
}

/** Change what the bar shows and draw it. Answers false on a page with no bar. */
export function patchTopBar(change: Partial<TopBarView>, doc: Document = document): boolean {
  const found = barOf(doc);
  if (!found) return false;
  const { el, bar } = found;
  let changed = !el.hasChildNodes();
  for (const key in change) {
    const k = key as keyof TopBarView;
    if (change[k] !== bar.view[k]) changed = true;
  }
  if (!changed) return true;
  bar.view = { ...bar.view, ...change };
  draw(el, bar);
  return true;
}

/** What the bar shows now ({@link FIRST_TOP_BAR} on a page with no bar). */
export function topBarView(doc: Document = document): TopBarView {
  return barOf(doc)?.bar.view ?? FIRST_TOP_BAR;
}

/** Answer the bar's `name` control with `run`, in place of any earlier answer. */
export function onTopBar<K extends TopBarAction>(name: K, run: TopBarActions[K], doc: Document = document): void {
  const found = barOf(doc);
  if (found) found.bar.on[name] = run;
}
