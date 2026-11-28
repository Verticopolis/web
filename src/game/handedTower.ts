import type { GameApp } from "../main";
import { trackAppAction } from "../analytics";
import { DESKTOP_BUILD } from "../deployTarget";
import { readPickedFile } from "../ui/uiImport";
import { isEngineStopped } from "./interactionState";

/**
 * A tower file the desktop app hands the game to open. The app that serves
 * the desktop build may start the game with a tower already picked (another
 * window in the same app asked for it); it answers this path on the game's
 * own host with the file, once, and with 204 when there is none. The game
 * asks once as it boots and opens what comes back as a picked file, the same
 * as a file dropped on the game, so on a resumed tower it replaces the
 * running one without a question, as a drop does. Only the desktop build
 * asks: a web host has no such path.
 */

/** Where the desktop app answers with the handed tower file. */
export const HANDED_TOWER_PATH = "/api/handed-tower";
/** The response header that names the file, URI-encoded. */
export const HANDED_TOWER_NAME = "X-Tower-Name";
/** The name a handed file goes by when the app sends none. */
const UNNAMED = "Tower.vctower";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/** The handed tower file, or null when there is none or it cannot be read. */
export async function takeHandedTower(fetcher: Fetcher): Promise<File | null> {
  try {
    const answer = await fetcher(HANDED_TOWER_PATH, { cache: "no-store" });
    if (answer.status !== 200) return null;
    const bytes = await answer.arrayBuffer();
    if (bytes.byteLength === 0) return null;
    return new File([bytes], handedName(answer.headers.get(HANDED_TOWER_NAME)));
  } catch {
    return null;
  }
}

/** The file's name from the header, or a plain one when it is missing or
 *  not valid URI encoding. */
function handedName(header: string | null): string {
  if (!header) return UNNAMED;
  try {
    return decodeURIComponent(header) || UNNAMED;
  } catch {
    return UNNAMED;
  }
}

/** In the desktop build, open the tower the app handed the game, if any. */
export function wireHandedTower(app: GameApp, fetcher: Fetcher = (input, init) => fetch(input, init)): void {
  if (!DESKTOP_BUILD) return;
  void takeHandedTower(fetcher).then((file) => {
    if (!file || isEngineStopped()) return;
    trackAppAction("file_handed");
    readPickedFile(app.ui, file);
  });
}
