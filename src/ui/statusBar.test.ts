import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { showHintInStatusBar, showNewsInStatusBar, showToolInStatusBar, showTowerInStatusBar } from "./statusBar";

import { html } from "lit-html";
import { mountPage } from "./testing/litTestUtils";
beforeEach(() => {
  mountPage(html`<footer id="statusbar"></footer>`);
});
afterEach(() => {
  document.body.replaceChildren();
});

describe("status bar", () => {
  it("names the tower and its rules, and leaves the box alone when nothing changed", () => {
    showTowerInStatusBar("Skyspire", "modern");
    const cell = document.getElementById("sb-tower")!;
    expect(cell.textContent).toBe("Skyspire · Modern");
    const node = cell.firstChild;
    showTowerInStatusBar("Skyspire", "modern");
    expect(cell.firstChild).toBe(node); // no rewrite on an unchanged pass
    showTowerInStatusBar("Skyspire", "classic");
    expect(cell.textContent).toBe("Skyspire · Classic");
  });

  it("shows the newest bulletin line with its title, and clears on empty", () => {
    showNewsInStatusBar("Rent is due");
    const cell = document.getElementById("sb-news")!;
    expect(cell.textContent).toContain("Rent is due");
    expect(cell.title).toBe("Rent is due");
    showNewsInStatusBar("");
    expect(cell.textContent).toBe("");
  });

  it("speaks the newest line while the Bulletin window is closed, and leaves it to the window's log or a toast otherwise", () => {
    document.body.innerHTML += `<div id="sb-news-live"></div><div id="bulletin-win" hidden></div>`;
    const live = document.getElementById("sb-news-live")!;
    showNewsInStatusBar("Rent is due");
    expect(live.textContent).toBe("Rent is due");
    showNewsInStatusBar("A toast said this", document, false);
    expect(live.textContent).toBe("Rent is due");
    document.getElementById("bulletin-win")!.hidden = false;
    showNewsInStatusBar("The window says this");
    expect(live.textContent).toBe("Rent is due");
    expect(document.getElementById("sb-news")!.textContent).toBe("The window says this");
  });

  it("shows the picked tool's card and gives back its box, and puts a Tools hint in its place", () => {
    const box = showToolInStatusBar("Lobby: $5,000");
    expect(box).toBe(document.getElementById("tool-info"));
    expect(box!.textContent).toBe("Lobby: $5,000");
    expect(document.getElementById("sb-hint")!.hidden).toBe(true);
    showHintInStatusBar("Office: Rents to a company.");
    expect(document.getElementById("sb-hint")!.hidden).toBe(false);
    expect(document.getElementById("sb-hint")!.textContent).toBe("Office: Rents to a company.");
    // The other boxes keep what they showed.
    showTowerInStatusBar("Skyspire", "classic");
    showHintInStatusBar("");
    expect(document.getElementById("sb-hint")!.hidden).toBe(true);
    expect(document.getElementById("tool-info")!.textContent).toBe("Lobby: $5,000");
    expect(document.getElementById("sb-tower")!.textContent).toBe("Skyspire · Classic");
  });

  it("does nothing on a page without the bar", () => {
    document.body.replaceChildren();
    expect(() => {
      showTowerInStatusBar("T", "classic");
      showNewsInStatusBar("x");
      expect(showToolInStatusBar("card")).toBeNull();
      showHintInStatusBar("hint");
    }).not.toThrow();
  });
});
