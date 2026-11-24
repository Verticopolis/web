/**
 * The 4.0 launch fireworks: a short, one-time celebration the first time a
 * player opens version 4 or any later build (owner, 2026-11-14: every
 * release from 4.0 on, for good). Presentation only; nothing
 * here touches the tower or the engine.
 *
 * It plays until the player closes it, then never again on that browser
 * profile, latched in localStorage like the Founder welcome (`src/founder.ts`).
 * Only a close the player makes sets the latch (OK, the ✕, Escape or a click on
 * the backdrop; owner, 2026-11-14): a reload, a closed tab, or another dialog
 * replacing the welcome leaves it unset, so the next load shows it again. When
 * storage is blocked it never plays, because without the latch it would replay
 * on every boot. Browser automation
 * (`navigator.webdriver`: the e2e suites, the screenshot gallery, the visual
 * baselines) never sees it, so a release branch renders the same pixels as
 * `main`. `?debug=fireworks` plays it anywhere, any version, without touching
 * the latch, so it can be previewed.
 *
 * The show: the components' pixel fireworks (`playFireworks`, a
 * low-resolution canvas scaled up without smoothing) behind the game's own
 * modal, which carries the
 * welcome and a few first-time help links (`src/ui/templates/welcome.ts`).
 * The fireworks end on their own; the window never closes by itself (owner
 * and the player panel, 2026-11-14,
 * `_bmad-output/party-mode/welcome-window-close-party-findings-2026-11-14.md`)
 * and closes as every dialog does: OK, its ✕, Escape, or a click on the
 * backdrop. With reduced motion on, one still frame of bursts and nothing
 * animates.
 */

import { APP_VERSION } from "../appVersion";
import { PREVIEW_DEPLOY } from "../deployTarget";
import { DEBUG_FLAG, debugFlagOn } from "../debugFlags";
import type { ModalView } from "@verticopolis/components/windows/uiModal";
import { playFireworks } from "@verticopolis/components/windows/fireworks";
import { WELCOME_LINKS, welcomeModalTemplate } from "./templates/welcome";
import { trackAppAction } from "../analytics";

/** The localStorage latch, set once the player has closed the welcome here. */
export const LAUNCH_FIREWORKS_SEEN_KEY = "vc-launch-fireworks-4";
/** The first major version the celebration plays on; every later one plays it too. */
export const LAUNCH_FIREWORKS_FROM_MAJOR = 4;
/** The major number of a version string, or NaN for "dev" and the like. */
export function majorOf(version: string): number {
  return Number.parseInt(version.split(".")[0] ?? "", 10);
}

/** Where the decision to play comes from. */
export interface LaunchFireworksGate {
  /** The build's version (`APP_VERSION`). */
  version: string;
  /** True under browser automation (`navigator.webdriver`). */
  automated: boolean;
  /** True when `?debug=fireworks` asks for a preview. */
  forced: boolean;
  /** True on a Vercel preview deployment. A preview still carries the last
   *  released version (the release PR raises it), so there the show plays
   *  whatever the version, latched as usual. */
  previewDeploy: boolean;
  /** The profile's storage; a getter that throws counts as blocked. */
  storage: () => Pick<Storage, "getItem">;
}

/**
 * Whether the celebration plays on this boot. A forced preview always plays.
 * Otherwise it plays only on version 4 or later (or any build on a preview
 * deployment, whose version is not raised yet), never under automation, and
 * only while the latch is unset. It only reads the latch: closing the welcome
 * sets it ({@link latchLaunchFireworks}), so a boot that ends before the
 * player closes it plays again next time.
 */
export function shouldPlayLaunchFireworks(gate: LaunchFireworksGate): boolean {
  if (gate.forced) return true;
  if (gate.automated) return false;
  if (!gate.previewDeploy && !(majorOf(gate.version) >= LAUNCH_FIREWORKS_FROM_MAJOR)) return false; // NaN (a dev build) fails too
  try {
    return gate.storage().getItem(LAUNCH_FIREWORKS_SEEN_KEY) !== "1";
  } catch {
    return false; // storage blocked: it would replay on every boot, so skip it
  }
}

/** Set the latch, so the welcome never plays again on this profile. Called
 *  when the player closes it; a storage failure only means it plays again. */
export function latchLaunchFireworks(storage: () => Pick<Storage, "setItem">): void {
  try {
    storage().setItem(LAUNCH_FIREWORKS_SEEN_KEY, "1");
  } catch {
    /* it shows once more next boot, which is harmless */
  }
}

/** The two modal primitives of `UI` the welcome opens through, so it wears
 *  the same window grammar as every other dialog (title bar, ✕, Escape, a
 *  click on the backdrop, the OK button). */
export interface WelcomeModalPort {
  openModal(view: ModalView, opts?: { displaceable?: boolean; onDisplaced?: () => void }): HTMLElement;
  wireActions(box: HTMLElement): void;
}

/** What the show needs from the page, injectable for tests. */
export interface ShowDeps {
  ui: WelcomeModalPort;
  reducedMotion: boolean;
  /** Runs once when the player closes the welcome themselves (OK, the ✕,
   *  Escape or the backdrop), never when another dialog replaces it. */
  onClosed?: () => void;
}

/** The welcome's analytics: `welcome_shown` now, then one `welcome_close`
 *  naming how it closed (OK, the ✕, Escape or a backdrop click; a
 *  displacement reports itself), and a `welcome_link` per help link. Returns
 *  the call that stops listening. */
function trackWelcome(dialog: HTMLDialogElement): () => void {
  trackAppAction("welcome_shown");
  let how = "other";
  const onClick = (e: MouseEvent) => {
    if (e.target === dialog) how = "backdrop";
    const el = e.target instanceof Element ? e.target : null;
    if (el?.closest("[data-act='close']")) how = "ok";
    const href = el?.closest("a")?.getAttribute("href") ?? "";
    if (href.startsWith(WELCOME_LINKS.firstTower.href)) trackAppAction("welcome_link", "first_tower");
    else if (href.startsWith(WELCOME_LINKS.modes.href)) trackAppAction("welcome_link", "modes");
    else if (href.startsWith(WELCOME_LINKS.whatsNew.href)) trackAppAction("welcome_link", "whats_new");
  };
  // Escape reaches the dialog as a keydown, then its cancel; the ✕ sends a
  // cancel alone.
  let escape = false;
  const onKey = (e: KeyboardEvent) => {
    escape = e.key === "Escape";
  };
  const onCancel = () => {
    how = escape ? "escape" : "x";
  };
  const onClose = () => {
    stop();
    trackAppAction("welcome_close", how);
  };
  // The dialog element outlives the welcome when another dialog displaces
  // it, so a displacement stops listening at once.
  const stop = () => {
    dialog.removeEventListener("click", onClick, true);
    dialog.removeEventListener("keydown", onKey, true);
    dialog.removeEventListener("cancel", onCancel, true);
    dialog.removeEventListener("close", onClose);
  };
  dialog.addEventListener("click", onClick, true);
  dialog.addEventListener("keydown", onKey, true);
  dialog.addEventListener("cancel", onCancel, true);
  dialog.addEventListener("close", onClose);
  return stop;
}

/**
 * Open the welcome in the shared modal and set the fireworks off behind it.
 * The window is the game's own dialog (`welcomeModalTemplate`), so it closes
 * the way every dialog does and never by itself (owner and the player panel,
 * 2026-11-14). The fireworks (`playFireworks`) go first inside the dialog
 * element, under its box and over its dimmed backdrop, so closing the dialog
 * (which empties it) takes them with it; their frame loop stops when the
 * canvas leaves the page or the sky empties.
 *
 * Every one of the player's closes goes through the dialog's `close` event
 * (`UI.closeModal`), while a dialog that replaces the welcome swaps the
 * content of a dialog that stays open and reports it through `onDisplaced`.
 * So `onClosed` runs on a `close` unless the welcome was displaced first.
 */
export function showLaunchFireworks(deps: ShowDeps): void {
  let displaced = false;
  let stopTracking = (): void => {};
  const box = deps.ui.openModal(welcomeModalTemplate(), {
    displaceable: true,
    onDisplaced: () => {
      displaced = true;
      stopTracking();
      trackAppAction("welcome_close", "displaced");
    },
  });
  deps.ui.wireActions(box);
  const dialog = box.closest("dialog");
  if (!dialog) return;
  stopTracking = trackWelcome(dialog);
  const onClosed = deps.onClosed;
  if (onClosed) dialog.addEventListener("close", () => !displaced && onClosed(), { once: true });

  // The fireworks go first inside the dialog, under its box and over its
  // dimmed backdrop. Closing the dialog empties it and takes the canvas, which
  // ends the frame loop.
  playFireworks(document, dialog, {
    reducedMotion: deps.reducedMotion,
    width: window.innerWidth,
    height: window.innerHeight,
  });
}

/**
 * The boot's one call: play the show when {@link shouldPlayLaunchFireworks}
 * says so for this build, page and profile. `reducedMotion` is read only when
 * the show plays. Closing the welcome sets the latch, except for a forced
 * preview, which never touches it. A boot that could not read the player's
 * save skips it, leaving the latch for a later boot. Reads the page once;
 * never throws.
 */
export function maybeLaunchFireworks(
  ui: WelcomeModalPort,
  reducedMotion: () => boolean,
  saveWasUnreadable = false,
): void {
  // Never on top of the unreadable-save warning; a later boot plays it.
  if (saveWasUnreadable) return;
  try {
    const forced = debugFlagOn(location.search, DEBUG_FLAG.fireworks);
    const storage = () => localStorage;
    const play = shouldPlayLaunchFireworks({
      version: APP_VERSION,
      automated: navigator.webdriver === true,
      forced,
      previewDeploy: PREVIEW_DEPLOY,
      storage,
    });
    if (!play) return;
    const onClosed = forced ? undefined : () => latchLaunchFireworks(storage);
    showLaunchFireworks({ ui, reducedMotion: reducedMotion(), onClosed });
  } catch {
    /* a celebration must never break boot */
  }
}
