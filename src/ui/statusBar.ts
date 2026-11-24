import { render } from "lit-html";
import type { GameMode } from "@verticopolis/engine/model/types";
import { statusBarTemplate, type StatusBarView } from "@verticopolis/components/windows/bars/statusBar";
import { RULE_SET_NAME } from "./ruleSetName";

/**
 * The Win95 status bar along the foot of the tower (index.html `#statusbar`),
 * drawn by the components package's {@link statusBarTemplate}: the hint for
 * the tool under the pointer in the Tools window, the picked tool's card, the
 * tower and its rules, and the newest bulletin line. Each box has one writer
 * here, and each write draws the whole bar from the view the bar last showed,
 * so lit touches only the box that changed.
 *
 * The newest line is also spoken through `#sb-news-live` while the Bulletin
 * window is closed (its own log is the live region when it is open).
 *
 * Cost: the status pump calls {@link showTowerInStatusBar} on every pass, so
 * it draws only when the name or the rules change. The bulletin calls
 * {@link showNewsInStatusBar} once per batch of new lines, the Tools window
 * {@link showHintInStatusBar} once per button entered, and a tool pick
 * {@link showToolInStatusBar} once.
 */

/** What each bar shows now, by the bar's element, so a page drawn again
 *  (a test's fresh fixture) starts from an empty bar. */
const views = new WeakMap<HTMLElement, StatusBarView>();

const EMPTY: StatusBarView = { hint: "", tool: "", tower: "", news: "" };

/** Draw the bar with `change` over what it shows now. False without a bar. */
function draw(doc: Document, change: Partial<StatusBarView>): boolean {
  const bar = doc.getElementById("statusbar");
  if (!bar) return false;
  const view = { ...(views.get(bar) ?? EMPTY), ...change };
  views.set(bar, view);
  render(statusBarTemplate(view), bar);
  return true;
}

/** The cell last written and what it shows, so an unchanged pass is two
 *  compares with no lookup and no string built (the pump's per-pass budget). */
let shown: { bar: HTMLElement; name: string; mode: GameMode } | undefined;

/** Show the tower's name and rules, drawing only on a change. */
export function showTowerInStatusBar(name: string, mode: GameMode, doc: Document = document): void {
  if (shown && shown.name === name && shown.mode === mode && shown.bar.ownerDocument === doc && shown.bar.isConnected)
    return;
  if (!draw(doc, { tower: `${name} · ${RULE_SET_NAME[mode]}` })) return;
  shown = { bar: doc.getElementById("statusbar")!, name, mode };
}

/** Show the newest bulletin line (empty clears the box). With `speak`, a
 *  screen reader hears it too while the Bulletin window is closed: the
 *  window's own log speaks when it is open, and a line already shown as a
 *  toast was spoken by the toast rail, so its caller passes false. */
export function showNewsInStatusBar(text: string, doc: Document = document, speak = true): void {
  const live = doc.getElementById("sb-news-live");
  if (live && speak && text && doc.getElementById("bulletin-win")?.hidden !== false) live.textContent = text;
  draw(doc, { news: text });
}

/** Show the picked tool's card (any value lit draws, such as a template),
 *  and give back its box, `#tool-info`, or null without a bar. */
export function showToolInStatusBar(card: unknown, doc: Document = document): HTMLElement | null {
  return draw(doc, { tool: card }) ? doc.getElementById("tool-info") : null;
}

/** Show the hint for the tool under the pointer in place of the card, or
 *  give the card its box back with "". */
export function showHintInStatusBar(hint: string, doc: Document = document): void {
  draw(doc, { hint });
}
