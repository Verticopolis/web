import { beforeEach, describe, expect, it } from "vitest";
import { html } from "lit-html";
import { mountAppDom, makeUI } from "../uiFixture";

/**
 * The UI's panel anchors on the app's own page: the editor card and the
 * inspect card pin beside a facility's screen rect and drop back to their
 * docked layout when released. Where a pin lands is `anchorBeside`'s, covered
 * by its own tests; these check the UI's calls reach the right window.
 */

const editorEl = (): HTMLElement => document.getElementById("editor")!;
const inspectorEl = (): HTMLElement => document.getElementById("inspector")!;
const RECT = { x: 200, y: 300, w: 40 };
const VIEW = { w: 1280, h: 800 };

beforeEach(() => {
  mountAppDom();
});

describe("UI panel anchors", () => {
  it("pins the editor card beside a facility and releases it", () => {
    const { ui } = makeUI();
    ui.anchorEditor(RECT, VIEW.w, VIEW.h);
    const s = editorEl().style;
    expect(s.left).toMatch(/^\d+px$/);
    expect(s.top).toMatch(/^\d+px$/);
    expect(s.right).toBe("auto");
    expect(s.bottom).toBe("auto");
    ui.clearEditorAnchor();
    expect([s.left, s.top, s.right, s.bottom]).toEqual(["", "", "", ""]);
    // Releasing an unpinned card leaves it as it is.
    ui.clearEditorAnchor();
    expect(s.left).toBe("");
  });

  it("shows, pins and hides the inspect card", () => {
    const { ui } = makeUI();
    expect(ui.isInspectorOpen()).toBe(false);
    ui.showInspector(html`<p>Office</p>`);
    expect(ui.isInspectorOpen()).toBe(true);
    ui.anchorInspector(RECT, VIEW.w, VIEW.h);
    expect(inspectorEl().style.left).toMatch(/^\d+px$/);
    ui.clearInspectorAnchor();
    expect(inspectorEl().style.left).toBe("");
    ui.showInspector(null);
    expect(ui.isInspectorOpen()).toBe(false);
  });
});
