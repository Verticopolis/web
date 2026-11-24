import { html, render, type TemplateResult } from "lit-html";
import {
  msToNextMinute,
  notFoundDeskTemplate,
  trayClock,
  type NotFoundLink as DeskLink,
  type NotFoundPickHow,
} from "@verticopolis/components/windows/notFoundDesk";
import { injectPageTelemetry } from "./telemetry";
import { trackAppAction } from "./analyticsActions";
import { BACK_NOTE_ID, backToOpenGame, takeFromGameFlag } from "./ui/fromGame";
import { GAME_HOME, HELP_ORIGIN, helpUrl } from "./helpAddress";

/**
 * Entry for the site's "page not found" page, `404.html`. The host serves it,
 * with a 404 status, for any path the site does not have, so a mistyped or
 * old link (`/help/changlog`, a page from a later build) gets a way on instead
 * of the host's own error page. The manual's own host (help.verticopolis.com)
 * serves the same file, so the page tells the two apart ({@link notFoundSite})
 * and puts the manual first there.
 *
 * It looks like the game on a computer: the components' 404 desk
 * (`notFoundDeskTemplate`), a message box on the teal 1994 desk with the
 * sunrise skyline from the startup screen and a taskbar. This file picks the
 * words and the links, and reports each pick. No game code runs here, and
 * the page is kept out of the offline precache.
 */

/** Which site the missing address belongs to. */
export type NotFoundSite = "game" | "help";

/** What a pick on the page reports in `not_found_pick`: one of its buttons,
 *  the window's close box, or the taskbar's Verticopolis button. */
export type NotFoundPick = "game" | "manual" | "changelog" | "rooms" | "close" | "taskbar";

/** A place the page offers, with the code its pick reports. */
export interface NotFoundLink {
  code: NotFoundPick;
  href: string;
  label: string;
}

/** The game's front page. Its link closes a game-opened tab instead. */
export const GAME_LINK: NotFoundLink = {
  code: "game",
  href: GAME_HOME,
  label: "Play the game",
};

/** The manual's pages a lost visitor most likely meant. */
export const MANUAL_LINKS: readonly NotFoundLink[] = [
  { code: "manual", href: helpUrl("/help"), label: "Player's Manual" },
  {
    code: "changelog",
    href: helpUrl("/help/changelog"),
    label: "Release notes",
  },
  { code: "rooms", href: helpUrl("/help/rooms"), label: "Every room" },
];

/**
 * Whether the missing address is the manual's: on the manual's own host in a
 * production build, or under /help on a build that serves it there.
 */
export function notFoundSite(
  loc: Pick<Location, "origin" | "pathname">,
  helpOrigin: string = HELP_ORIGIN,
): NotFoundSite {
  if (helpOrigin && loc.origin === helpOrigin) return "help";
  return /^\/help(?:\/|$)/.test(loc.pathname) ? "help" : "game";
}

/** The buttons in the order the page shows them: the site the visitor was on
 *  comes first, and its first button is the default. */
export function notFoundLinks(site: NotFoundSite): NotFoundLink[] {
  const [manual, ...rest] = MANUAL_LINKS;
  return site === "help" ? [manual, GAME_LINK, ...rest] : [GAME_LINK, manual, ...rest];
}

/** What the page shows: the missing `path` (rendered as text, which lit
 *  escapes), which site it is on, whether the game opened this tab, and the
 *  taskbar clock's text. */
export interface NotFoundView {
  path: string;
  site?: NotFoundSite;
  fromGame?: boolean;
  clock?: string;
}

/** The page: the components' 404 desk with this site's words and links.
 *  Pure, so the test renders it directly. */
export function notFoundPageTemplate(view: NotFoundView): TemplateResult {
  const { path, site = "game", fromGame = false, clock = "" } = view;
  // Every pick reports where it went: a click, keyboard Enter, or a
  // middle-click that opens it in a new tab. A way back to the game closes a
  // game-opened tab instead, as the manual's Back to game does.
  const onPick =
    (code: NotFoundPick, toGame: boolean) =>
    (e: MouseEvent, how: NotFoundPickHow): void => {
      trackAppAction("not_found_pick", code);
      if (toGame && fromGame && how === "click") backToOpenGame(e);
    };
  const backToGame = (code: NotFoundPick, label: string): DeskLink => ({
    href: GAME_HOME,
    label,
    act: "back-to-game",
    onPick: onPick(code, true),
  });
  const links = notFoundLinks(site).map((l): DeskLink =>
    l.code === "game" ? backToGame(l.code, l.label) : { href: l.href, label: l.label, onPick: onPick(l.code, false) },
  );
  return notFoundDeskTemplate({
    title: site === "help" ? "Verticopolis Player's Manual" : "Verticopolis",
    heading: site === "help" ? "Page 404 isn't in the manual." : "Floor 404 hasn't been built yet.",
    path,
    lines: ["The link may be mistyped, or the page may have moved."],
    links,
    close: backToGame("close", "Close and go to the game"),
    start: backToGame("taskbar", "Verticopolis"),
    task: "Page not found",
    clock,
    ...(fromGame ? { note: html`<p id=${BACK_NOTE_ID} class="page-note" tabindex="-1" hidden></p>` } : {}),
  });
}

function main(): void {
  const root = document.getElementById("app");
  if (!root) return;
  injectPageTelemetry();
  const site = notFoundSite(location);
  trackAppAction("not_found_view", site);
  const view: NotFoundView = {
    path: location.pathname,
    site,
    fromGame: takeFromGameFlag(location, history),
  };
  const fallback = [...root.childNodes];
  const draw = (): void => {
    render(notFoundPageTemplate({ ...view, clock: trayClock(new Date()) }), root);
  };
  draw();
  for (const node of fallback) node.remove();
  // The tray clock moves on the minute, as the desk's does.
  const tick = (): void => {
    draw();
    setTimeout(tick, msToNextMinute(new Date()));
  };
  setTimeout(tick, msToNextMinute(new Date()));
  (window as unknown as { notFoundReady?: boolean }).notFoundReady = true;
}

main();
