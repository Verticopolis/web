/**
 * The card shown while the game restarts its graphics in place after the
 * device dropped them (#321). The canvas is frozen for that wait (up to about
 * eight seconds, longer in a background tab), so the card holds the page the
 * way the crash card does: a modal `<dialog>` makes the menus, the palette and
 * the speed buttons inert, and the game's own key handlers read
 * `isRecoveringGraphics` (`src/game/interactionState.ts`) from its element.
 * Nothing can change the tower blind while the picture is gone. It is the
 * components' `AlertCard` as a wait: no buttons, its text heard as a status,
 * Escape refused, and it closes only when the recovery ends.
 */
import { AlertCard } from "@verticopolis/components/windows/alertCard";

export const GRAPHICS_RECOVERY_ID = "graphics-recovery";

/** Put the card up and return the function that takes it down. Over the title
 *  screen no tower is in play (a first-timer has none), so the card speaks of
 *  the saved towers instead of "your tower". */
export function showGraphicsRecovery(onTitleScreen = false): () => void {
  const safe = onTitleScreen ? "Your saved towers are untouched." : "Your tower is safe.";
  document.getElementById(GRAPHICS_RECOVERY_ID)?.remove();
  const card = new AlertCard(document, GRAPHICS_RECOVERY_ID, {
    title: "Recovering graphics",
    kind: "wait",
    text: [`The device reset the game's graphics. The game is restarting them, which takes a few seconds. ${safe}`],
  });
  return () => card.close();
}
