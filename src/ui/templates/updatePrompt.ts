import type { ModalView } from "@verticopolis/components/windows/uiModal";
import { updateBoxView } from "@verticopolis/components/windows/updateBox";
import type { UpdateInfo } from "../../pwa";
import { SHORT_NOTES } from "../../pwaUpdateInfo";
import { fromGameHref } from "../fromGame";
import { helpUrl } from "../../helpAddress";

/**
 * The "a new build is ready" prompt: the components' update box
 * (`updateBoxView`) with this game's words, built from `version.json` (see
 * src/pwa.ts). The box draws the notes (a short list, or the scrolling well
 * for a long release or every skipped version, #1897), the "All release
 * notes" link, the build lines and Later and Update now, with Later focused.
 * The controller (`showUpdatePrompt`) owns the resolve-exactly-once logic, the
 * async fire-and-forget containment, and the Esc/backdrop/x "Later" paths.
 * lit escapes every note and line.
 */

/** The two actions the update prompt dispatches. */
export interface UpdatePromptActions {
  /** Keep playing: apply the update on the next reopen. */
  onLater: () => void;
  /** Update now: save the tower and reload onto the new build. */
  onUpdate: () => void;
}

const KIND_LABEL = { game: "Game update", engine: "Engine update", both: "Game and engine update" } as const;

/** Presentation choices the controller makes for the update prompt. */
export interface UpdatePromptOptions {
  /** Show the "All release notes" link under the notes. The controller turns it
   *  off in the installed app, where a new tab leaves the app for the browser. */
  releaseNotesLink?: boolean;
}

/** The release notes page, at the incoming version's section when there is
 *  one. `from=game` tells the page a running game opened it, so its "Back to
 *  game" closes the tab instead of loading a second game (src/ui/fromGame.ts). */
export function releaseNotesHref(version: string | undefined): string {
  return fromGameHref(
    helpUrl(version ? `/help/changelog#${encodeURIComponent(version)}` : "/help/changelog"),
    "update_prompt",
  );
}

export function updatePromptTemplate(
  info: UpdateInfo | null | undefined,
  actions: UpdatePromptActions,
  options: UpdatePromptOptions = {},
): ModalView {
  // Keep a real sha (it anchors a bug report to an exact build) but drop the
  // "unknown" placeholder a non-git build would stamp.
  const sha = info?.sha && info.sha !== "unknown" ? info.sha : undefined;
  const idText = [info?.version, sha].filter(Boolean).join(" · ");
  const buildLines = [info?.engineLine, idText ? `Build ${idText}` : undefined].filter((l): l is string => !!l);
  return updateBoxView(
    {
      title: "Update available",
      ...(info?.kind ? { kind: KIND_LABEL[info.kind] } : {}),
      text: [
        "A newer version of Verticopolis is ready. Update now saves your tower and reloads onto it. You won't lose any progress.",
        "Or keep playing: it'll apply next time you reopen.",
      ],
      ...(info?.version ? { version: info.version } : {}),
      notes: info?.notes ?? [],
      ...(info?.releases ? { releases: info.releases } : {}),
      ...(info?.since ? { since: info.since } : {}),
      ...(info?.more ? { more: true } : {}),
      shortNotes: SHORT_NOTES,
      ...(options.releaseNotesLink ? { allNotesHref: releaseNotesHref(info?.version) } : {}),
      buildLines,
    },
    { later: actions.onLater, update: actions.onUpdate },
  );
}
