import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { html } from "lit-html";
import { mountPage } from "../testing/litTestUtils";
import { drawMenuBar, onMenuItem } from "../../game/menuBarHost";

vi.mock("../../analyticsActions", () => ({ trackAppAction: vi.fn(), trackAppActionOnce: vi.fn() }));

import { trackAppAction, trackAppActionOnce } from "../../analyticsActions";
import { DESK_MQ } from "@verticopolis/components/windows/desk/deskScreen";
import { DESK_TITLE_CLASS } from "@verticopolis/components/windows/desk/deskTitle";
import { DeskController } from "./deskController";

/** The title screen over the game, on a computer. */
const PAGE = html`
  <div id="app"><div id="menubar-host"></div><div id="stage">tower</div></div>
  <div id="splash"><button class="splash-btn">Open</button><button class="splash-btn primary">New</button></div>`;

let doc: Document;

beforeEach(() => {
  doc = document.implementation.createHTMLDocument("Verticopolis");
  mountPage(PAGE, doc);
  drawMenuBar(doc);
  doc.body.classList.add("splash-up");
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: query === DESK_MQ, addEventListener: () => {} })),
  );
  vi.mocked(trackAppAction).mockClear();
  vi.mocked(trackAppActionOnce).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the title screen on the desk", () => {
  it("puts the title screen in a Verticopolis window with its own taskbar, and no Control Panel", () => {
    new DeskController(doc).start();
    expect(doc.body.classList.contains(DESK_TITLE_CLASS)).toBe(true);
    expect(doc.querySelectorAll(".desk-title-bar")).toHaveLength(1);
    expect([...doc.querySelectorAll(".desk-taskbar-title .desk-task")].map((b) => b.textContent?.trim())).toEqual([
      "Verticopolis",
    ]);
    expect(doc.querySelector(".desk-tray-display")).toBeNull();
    doc.querySelector<HTMLElement>(".desk-start")!.click();
    expect(doc.querySelector('.desk-start-menu [data-item="desk-control-panel"]')).toBeNull();
  });

  it("focuses the title screen's first button from its taskbar button", () => {
    new DeskController(doc).start();
    doc.querySelector<HTMLElement>(".desk-task")!.click();
    expect(doc.activeElement).toBe(doc.querySelector("#splash .primary"));
  });

  it("runs a Verticopolis menu item, and leaves out Close, since there is no tower to close", () => {
    new DeskController(doc).start();
    const open = vi.fn();
    onMenuItem("mb-import", open, doc);
    doc.getElementById("mb-close")!.hidden = true;
    doc.querySelector<HTMLElement>(".desk-start")!.click();
    const items = [...doc.querySelectorAll(".desk-start-menu [data-item]")].map((b) => b.getAttribute("data-item"));
    expect(items).toEqual(["btn-new", "mb-import"]);
    doc.querySelector<HTMLElement>('.desk-start-menu [data-item="mb-import"]')!.click();
    expect(open).toHaveBeenCalledTimes(1);
    expect(trackAppAction).toHaveBeenCalledWith("desk_start", "mb-import");
  });

  it("shows the sound on its tray's speaker as the game switches it", async () => {
    new DeskController(doc).start();
    const sound = doc.getElementById("mb-sound")!;
    sound.addEventListener("click", () =>
      sound.setAttribute("aria-checked", String(sound.getAttribute("aria-checked") === "false")),
    );
    doc.querySelector<HTMLElement>(".desk-tray-sound")!.click();
    await Promise.resolve();
    expect(doc.querySelector(".desk-tray-sound")!.classList.contains("muted")).toBe(true);
  });

  it("counts the title window showing once, its taskbar button, the Verticopolis menu opening and the tray's sound", () => {
    new DeskController(doc).start();
    expect(trackAppActionOnce).toHaveBeenCalledWith("desk_title_shown");
    doc.querySelector<HTMLElement>(".desk-task")!.click();
    expect(trackAppAction).toHaveBeenCalledWith("desk_task", "title_front");
    doc.querySelector<HTMLElement>(".desk-start")!.click();
    expect(trackAppAction).toHaveBeenCalledWith("desk_start_open", "title");
    doc.querySelector<HTMLElement>(".desk-tray-sound")!.click();
    expect(trackAppAction).toHaveBeenCalledWith("desk_tray", "sound");
  });
});
