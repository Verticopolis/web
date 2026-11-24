import type { TemplateResult } from "lit-html";
import {
  titleScreenTemplate,
  type TitleAction,
  type TitleScreenView,
} from "@verticopolis/components/windows/titleScreen/titleScreen";
import { versionLine } from "../engineHost/engineLabel";
import { platformLabel } from "../analyticsEnrichment";
import { trackAppAction } from "../analytics";

/**
 * The game's side of the "Metropolis Dusk" title screen, which the components
 * package draws (`titleScreenTemplate`): the premise, the buttons and what
 * they do, the small print, the version, the Ground floor badge, and the mute,
 * install and sponsor corners. The onboarding controller (`Onboarding.ts`)
 * owns everything imperative (mount, focus trap, backdrop and Esc dismissal).
 */

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/** Where the splash's Sponsor link goes: the owner's GitHub Sponsors page, the
 *  same account the org-wide `.github/FUNDING.yml` (in Verticopolis/.github)
 *  names. The help site's Support page links the same address
 *  (help-site/site.mjs, SPONSOR_URL), and a test holds the two equal. The game stays
 *  free and nothing in it is locked; this is a tip jar. */
export const SPONSOR_URL = "https://github.com/sponsors/maniator";

/** sessionStorage key that remembers this tab launched as the Android app, so
 *  a later title screen in the same tab (after Back to game from the help site,
 *  which drops the `?src=twa` marker) still knows. */
export const TWA_SESSION_KEY = "vc-twa-session";

/** Whether the splash shows the Sponsor link: every session but the Android
 *  app (the TWA, marked by its `?src=twa` launch URL and remembered for the
 *  tab). Google Play expects a tip inside a store app to go through Play's
 *  own billing, and the July monetization brief keeps any Play tip behind its
 *  own approval, so the store app shows no link to an outside payment page. */
export function sponsorOffered(storage: () => Storage = () => sessionStorage): boolean {
  let remembered = false;
  try {
    const s = storage();
    if (platformLabel() === "twa") s.setItem(TWA_SESSION_KEY, "1");
    remembered = s.getItem(TWA_SESSION_KEY) === "1";
  } catch {
    // Storage blocked: fall back to the launch URL alone.
  }
  return !remembered && platformLabel() !== "twa";
}

/** Count a tap on the splash's Sponsor link as the `sponsor_click` app action
 *  (`detail` "splash"): a click, a keyboard Enter, or a middle-click (the
 *  package hears only those). It records the tap only: the link still opens
 *  GitHub Sponsors in a new tab, and nothing about the sponsorship is known
 *  here. */
function noteSponsorClick(): void {
  trackAppAction("sponsor_click", "splash");
}

/** Click handlers the splash template binds through lit `@click`. `onToggleMute`
 *  is optional: when a caller can't toggle (no audio port), it is undefined, lit
 *  binds no listener, and the mute button can't flip its glyph while the real
 *  audio state stays put (SPEC-splash-mute CAP-2). */
export interface SplashHandlers {
  onContinue: () => void;
  /** Open the load-only tower picker (SPEC-splash-load-tower CAP-1). Always
   *  bound: the picker is the only route to a manual slot or a `.vctower`
   *  file from the title screen, and it stays useful when nothing is saved
   *  yet (its file row is how a new device gets its towers back). */
  onLoadTower: () => void;
  onNewTower: () => void;
  onHelp: () => void;
  onToggleMute?: (e: Event) => void;
  /** Tap the persistent splash install button (SPEC-pwa-install CAP-5). The
   *  button renders only when `installOffered` says so, which excludes
   *  standalone / TWA sessions. */
  onInstall?: () => void;
}

/** The small print along the bottom of the title screen. */
const ATTRIBUTION =
  "An unofficial, from-scratch homage to SimTower (1994). Original code and art; no ripped assets. Not affiliated with or endorsed by Maxis / OPeNBooK / Vivarium.";

/**
 * What the title screen shows and does. The buttons run Continue (with a
 * save), Open Tower…, New Tower, then How to Play (SPEC-splash-load-tower
 * CAP-1): New Tower is the one action that can cost the player something, so
 * it sits furthest from the default focus. Exactly one amber plate shows,
 * Continue with a save and New Tower without. The Ground floor badge shows
 * only when the loaded tower predates 2.0. The mute's name stays "Mute sound"
 * and `aria-pressed` carries its state; without `onToggleMute` it is inert
 * (SPEC-splash-mute CAP-2). Install shows only when offered and bound
 * (SPEC-pwa-install CAP-5), and Sponsor everywhere but the Android app.
 */
export function splashView(
  hasSave: boolean,
  premise: string,
  muted: boolean,
  installOffered: boolean,
  founder: boolean,
  h: SplashHandlers,
): TitleScreenView {
  const actions: TitleAction[] = [];
  if (hasSave)
    actions.push({ id: "continue", label: "Continue", icon: "play", look: "primary", onPress: h.onContinue });
  actions.push(
    { id: "load", label: "Open Tower…", icon: "folder", onPress: h.onLoadTower },
    { id: "new", label: "New Tower", icon: "plus", look: hasSave ? undefined : "primary", onPress: h.onNewTower },
    { id: "help", label: "How to Play", icon: "help", look: "ghost", onPress: h.onHelp },
  );
  const onInstall = h.onInstall;
  return {
    premise,
    actions,
    attribution: ATTRIBUTION,
    version: versionLine(APP_VERSION),
    badge: founder ? "★ Ground floor" : undefined,
    mute: { muted, label: "Mute sound", onToggle: h.onToggleMute },
    install:
      installOffered && onInstall
        ? {
            label: "Install",
            name: "Install Verticopolis",
            title: "Install Verticopolis: play offline, fullscreen, from your home screen.",
            onPress: onInstall,
          }
        : undefined,
    sponsor: sponsorOffered()
      ? {
          href: SPONSOR_URL,
          label: "Sponsor",
          title: "Verticopolis is free. Sponsoring helps keep it going.",
          onOpen: noteSponsorClick,
        }
      : undefined,
  };
}

/** The title screen for `splashView`'s arguments. */
export function splashTemplate(
  hasSave: boolean,
  premise: string,
  muted: boolean,
  installOffered: boolean,
  founder: boolean,
  h: SplashHandlers,
): TemplateResult {
  return titleScreenTemplate(splashView(hasSave, premise, muted, installOffered, founder, h));
}
