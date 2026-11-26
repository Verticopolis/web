import { render, nothing, type TemplateResult } from "lit-html";
import type { UI } from "./UI";
import { syncRungSelects } from "./templates/rungPicker";

/**
 * Editor panel rendering and placement for {@link UI}, as friend
 * functions taking the UI instance, plus the pure placement helper
 * ({@link anchorBeside}) they build on. Extracted from `UI.ts`; the class
 * keeps thin delegations.
 */

/** Render the editor card for the current selection through lit (E6-S1). lit's
 *  binding diff patches only the values that changed since the last pump, so
 *  the buttons and rename input keep their element identity across refreshes,
 *  a refresh can never land mid-click and swallow it (the old
 *  `key`/`patchVolatile` protocol existed to guarantee exactly this).
 *  `#editor` is lit's container exclusively (one container, one renderer);
 *  never write its innerHTML around lit's back. */
export function renderEditor(ui: UI, tpl: TemplateResult): void {
  render(tpl, ui.el.editor);
  // Selection on a native select must be written after the options attach
  // (see rungPicker.ts); a no-op when the card has no picker or it already
  // agrees with the engine.
  syncRungSelects(ui.el.editor);
  ui.el.editor.classList.remove("hidden");
  // Re-measure after every render so per-frame anchoring keeps reading the
  // cache, never layout. This runs at the ~6 Hz editor pump, not per frame,
  // and the pump's own status-bar writes already leave layout dirty for the
  // coming frame, so the forced read here does work that frame was about to
  // do anyway. (The old builder measured only on a shape-key change and could
  // serve a stale size after a value-width change; this is simpler and fresher.)
  ui.editorSize = { w: ui.el.editor.offsetWidth, h: ui.el.editor.offsetHeight };
}

export function hideEditor(ui: UI): void {
  ui.el.editor.classList.add("hidden");
  // Clear THROUGH lit, never innerHTML: lit tracks its rendered parts against
  // the container, and an external wipe would strand that bookkeeping and
  // break the next render.
  render(nothing, ui.el.editor);
}

export function isEditorOpen(ui: UI): boolean {
  return !ui.el.editor.classList.contains("hidden");
}

/** Anchor the editor card beside a facility's on-screen rect, preferring its
 *  right side, flipping left and clamping so it always stays on screen. */
export function anchorEditor(ui: UI, rect: { x: number; y: number; w: number }, viewW: number, viewH: number): void {
  const { left, top } = anchorBeside(rect, ui.editorSize, viewW, viewH);
  placePanel(ui.el.editor, left, top);
}

/** Drop one panel's inline anchor so it falls back to its CSS-docked layout.
 *  No-op when the panel carries no anchor, so per-frame calls cost nothing.
 *  Panels release independently: the mobile editor must fall back to its
 *  docked layout even while the peek card stays anchored beside its room. */
export function clearPanelAnchor(el: HTMLElement): void {
  if (!el.style.left && !el.style.top) return;
  el.style.left = el.style.top = el.style.right = el.style.bottom = "";
}

function placePanel(el: HTMLElement, left: number, top: number): void {
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
}

/**
 * Place a panel of `size` beside a facility's screen `rect`: prefer the rect's
 * right side, flip to the left when there isn't room, and clamp so the panel
 * always stays fully inside the viewport (with an 8px margin). Pure so the
 * placement logic is unit-testable without a DOM.
 */
export function anchorBeside(
  rect: { x: number; y: number; w: number },
  size: { w: number; h: number },
  viewW: number,
  viewH: number,
  gap = 8,
): { left: number; top: number } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
  let left = rect.x + rect.w + gap; // prefer the facility's right
  if (left + size.w > viewW - gap) left = rect.x - size.w - gap; // no room → flip left
  return {
    left: clamp(left, gap, Math.max(gap, viewW - size.w - gap)),
    top: clamp(rect.y, gap, Math.max(gap, viewH - size.h - gap)),
  };
}
