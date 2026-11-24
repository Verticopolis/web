import { downloadFile } from "./downloadFile";
import { buildCrashDetails, buildCrashReportZip, bugReportUrl, type CrashTower } from "../game/crashReport";
import type { CrashDescription, FrameErrorEntry } from "../game/crashReport";
import { html } from "lit-html";
import { AlertCard, type AlertCardView } from "@verticopolis/components/windows/alertCard";
import type { MessageParagraph } from "@verticopolis/components/windows/messageBox";
import { readRecoveryText } from "../storage/recoveryCopy";
import { downloadRecoveryCopy, RECOVERY_COPY_STATUS } from "./recoveryCopy";
import { GRAPHICS_RECOVERY_ID } from "./graphicsRecovery";

/**
 * The full-screen crash card. Shown when the game can no longer draw (the GPU
 * dropped the WebGL context). It replaces the old silent autosave-and-reload:
 * the player learns what happened, can download a crash-report zip (crash
 * details plus their tower save), can open a prefilled bug report, and reloads
 * when THEY choose to. Nothing here draws on the canvas: it is dead, and
 * everything here must work without it.
 *
 * The card is the components' `AlertCard`: a real dialog opened with
 * showModal(), so it wins over any other open dialog (help, stats, an
 * emergency), traps focus, makes the page behind inert, refuses Escape, and
 * is an alertdialog. This file writes the words and does what each button
 * asks.
 */

export interface CrashScreenOptions {
  crash: CrashDescription;
  /** Save-status detail for the message. `flushed` is the normal case;
   *  `behindSplash` means nothing was in progress to save. */
  save: { flushed: boolean; behindSplash: boolean; storageBlame: boolean; hadPriorSave: boolean };
  version: string;
  speed: number;
  /** Read live at click time; the engine outlives its renderer. */
  tower: () => CrashTower;
  frameErrors: readonly FrameErrorEntry[];
  /** Stamps the recovery session flags, then reloads (owned by SaveLoad). */
  onReload: () => void;
  /** The stored save's raw text for the recovery copy, read at click time. */
  recoveryText?: () => string | null;
}

/** Idempotence guard: context loss can only fire once per engine, but a
 *  defensive second call must not stack a second card. main.ts's key handler
 *  also checks this id to mute game shortcuts (undo could otherwise mutate
 *  the sim behind the card, after the flush the card just described). */
export const CRASH_SCREEN_ID = "crash-screen";

/** The one-sentence save-outcome line, best case first. */
function saveLineFor(save: CrashScreenOptions["save"]): string {
  if (save.behindSplash) return "No game was in progress; your saved towers are untouched.";
  if (save.flushed) return "Your tower was saved. Nothing is lost.";
  const priorNote = save.hadPriorSave ? " Your last saved tower is safe." : "";
  if (save.storageBlame) return "Your latest changes couldn't be saved: storage is full or blocked." + priorNote;
  return "Your latest changes couldn't be saved: the save hit an unexpected error." + priorNote;
}

export function showCrashScreen(opts: CrashScreenOptions): void {
  if (document.getElementById(CRASH_SCREEN_ID)) return;
  // A second loss during an in-place recovery lands here while the "Recovering
  // graphics" card is up; this card replaces it rather than stacking on it.
  document.getElementById(GRAPHICS_RECOVERY_ID)?.remove();

  // Device-distress advice: shown for a rapid double crash AND for a first
  // loss whose in-place recovery failed or timed out (the GPU stayed wedged
  // for seconds, which is the same distress signal by another route).
  const repeatLine: MessageParagraph[] = [];
  if (opts.crash.repeat)
    repeatLine.push(
      html`<b>This is the second crash in a row.</b> Closing other tabs or apps before reloading may help.`,
    );
  else if (opts.crash.recoveryFailed)
    repeatLine.push(
      html`<b>The game tried to restart its graphics and couldn't.</b> Closing other tabs or apps before reloading may help.`,
    );
  const text: MessageParagraph[] = [
    "The graphics driver reset while the game was running. On phones and tablets this usually means the device ran out of graphics memory, often on a very large tower at the fastest speed.",
    saveLineFor(opts.save),
    ...repeatLine,
    "A crash report helps us fix this. It's a zip with the crash details and your tower save; nothing is sent anywhere until you attach it to a bug report yourself.",
  ];
  const reportHref = bugReportUrl({ version: opts.version, crash: opts.crash });

  let status = "";
  let packing = false;
  const view = (): AlertCardView => ({
    title: "The game crashed",
    kind: "alert",
    text,
    status,
    buttons: [
      { label: "Download crash report", act: "download", disabled: packing, onPress: download },
      { label: "Download recovery copy", act: "recovery", onPress: recovery },
      {
        label: html`Report a bug<span class="visually-hidden"> (opens GitHub in a new tab)</span>`,
        act: "report",
        href: reportHref,
      },
      { label: "Reload game", act: "reload", primary: true, onPress: () => opts.onReload() },
    ],
    focus: "reload",
  });
  const say = (line: string, busy = false): void => {
    status = line;
    packing = busy;
    card.update(view());
  };
  function download(): void {
    // Busy while packing so a double-tap can't race two exports; free again
    // after a failure so the player can retry.
    say("Packing crash report…", true);
    void (async () => {
      // One capture per click: the JSON summary and the packed save must
      // describe the same tower even if the app swaps it meanwhile.
      const tower = opts.tower();
      const details = buildCrashDetails(tower, opts.crash, {
        version: opts.version,
        speed: opts.speed,
        frameErrors: opts.frameErrors,
      });
      const { filename, bytes } = await buildCrashReportZip(tower, details);
      downloadFile(filename, bytes, "application/zip");
      // Like the export flow, this points at the downloads folder rather than
      // asserting success: the browser owns the download from here.
      say("Crash report ready. Check your downloads, then attach the zip to your bug report.");
    })().catch((err) => {
      // Keep the diagnostic trail: this is the one feature whose whole point
      // is preserving evidence. The neutral wording covers both halves of the
      // pipeline (zip build and the download).
      console.error("[crash-report] packing or saving failed:", err);
      say("The crash report couldn't be saved. You can still reload; your tower's save state is described above.");
    });
  }
  // The stored save as it is, with no engine and no zip, so it works when
  // packing the report does not.
  function recovery(): void {
    say(RECOVERY_COPY_STATUS[downloadRecoveryCopy(opts.recoveryText ?? readRecoveryText)]);
  }
  const card = new AlertCard(document, CRASH_SCREEN_ID, view());
}
