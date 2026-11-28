import { DESKTOP_BUILD } from "../deployTarget";
import type { ShellAddress } from "../storage/shellMute";

/**
 * The desktop build's title theme carried on from a desktop shell's own
 * screen. A shell that played the theme before it opened the game passes
 * where it was in the address: `music`, seconds into the theme's loop, read
 * at `musicAt`, milliseconds since 1970. The game starts the theme from that
 * beat (plus the time since), so it plays on rather than starting over.
 */
export const SHELL_MUSIC_PARAM = "music";
export const SHELL_MUSIC_AT_PARAM = "musicAt";

/** Where another page's theme was, as the audio engine takes it. */
export interface ShellBeat {
  readonly seconds: number;
  readonly asOf: number;
}

/** The beat a shell passed in the address `search`, or null unless both
 *  numbers are there, finite and not negative. */
export function shellBeat(search: string): ShellBeat | null {
  const params = new URLSearchParams(search);
  const seconds = params.get(SHELL_MUSIC_PARAM)?.trim() ?? "";
  const asOf = params.get(SHELL_MUSIC_AT_PARAM)?.trim() ?? "";
  if (seconds === "" || asOf === "") return null;
  const beat = { seconds: Number(seconds), asOf: Number(asOf) };
  if (!Number.isFinite(beat.seconds) || !Number.isFinite(beat.asOf)) return null;
  if (beat.seconds < 0 || beat.asOf < 0) return null;
  return beat;
}

/** The part of the audio engine the theme's start needs. */
export interface ShellMusicAudio {
  continueMusic(seconds: number, asOf: number): void;
  start(): void;
}

/**
 * Starts the sound as the desktop build opens, from the shell's beat when it
 * passed one, and drops the beat from the address so a reload starts the
 * theme afresh.
 */
export function startShellSound(audio: ShellMusicAudio, at: ShellAddress): void {
  const beat = shellBeat(at.loc.search);
  if (beat) audio.continueMusic(beat.seconds, beat.asOf);
  audio.start();
  const params = new URLSearchParams(at.loc.search);
  if (!params.has(SHELL_MUSIC_PARAM) && !params.has(SHELL_MUSIC_AT_PARAM)) return;
  params.delete(SHELL_MUSIC_PARAM);
  params.delete(SHELL_MUSIC_AT_PARAM);
  const search = params.toString();
  try {
    at.history?.replaceState(null, "", `${at.loc.pathname}${search ? `?${search}` : ""}${at.loc.hash}`);
  } catch {
    // An address that cannot be rewritten only means a reload carries the theme on again.
  }
}

/** In the desktop build, whose shell lets sound play without a gesture, starts
 *  it as the game opens ({@link startShellSound}); the web build waits for the
 *  player's first press. */
export function startDesktopSound(audio: ShellMusicAudio): void {
  if (DESKTOP_BUILD) startShellSound(audio, { loc: window.location, history: window.history });
}
