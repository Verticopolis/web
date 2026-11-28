import { DESKTOP_BUILD } from "../deployTarget";
import { loadPrefs, savePrefs, type Prefs } from "./Prefs";

/** The address parameter a desktop shell opens the game with to pass on a
 *  sound setting the player chose before the game opened: `1` muted, `0` not. */
export const SHELL_MUTED_PARAM = "muted";

/** The mute a shell passed in the address `search`, or null when it passed none. */
export function shellMuted(search: string): boolean | null {
  const value = new URLSearchParams(search).get(SHELL_MUTED_PARAM);
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

/** The address seen by {@link adoptShellMute}, and the history it tidies. */
export interface ShellAddress {
  readonly loc: Pick<Location, "search" | "pathname" | "hash">;
  readonly history: Pick<History, "replaceState"> | null;
}

/**
 * Takes the mute a shell passed into `prefs` and saves it like the player's
 * own, then drops the parameter from the address so a reload keeps whatever
 * the player chose in the game since. Without the parameter, `prefs` is
 * returned as it was.
 */
export function adoptShellMute(prefs: Prefs, at: ShellAddress, save: (p: Prefs) => void = savePrefs): Prefs {
  const muted = shellMuted(at.loc.search);
  if (muted === null) return prefs;
  const next = { ...prefs, muted };
  save(next);
  const rest = new URLSearchParams(at.loc.search);
  rest.delete(SHELL_MUTED_PARAM);
  const search = rest.toString();
  try {
    at.history?.replaceState(null, "", `${at.loc.pathname}${search ? `?${search}` : ""}${at.loc.hash}`);
  } catch {
    // An address that cannot be rewritten only means a reload applies it again.
  }
  return next;
}

/** The prefs the game starts with: the saved ones, and in the desktop build
 *  the mute its shell passed in the address. */
export function startPrefs(): Prefs {
  const prefs = loadPrefs();
  return DESKTOP_BUILD ? adoptShellMute(prefs, { loc: window.location, history: window.history }) : prefs;
}
