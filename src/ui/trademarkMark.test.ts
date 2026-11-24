import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { settingsTemplate } from "./templates/settings";
import { helpAboutBody } from "./templates/helpContent";
import { renderToFragment } from "./testing/litTestUtils";
import { topBarTemplate, type TopBarActions } from "@verticopolis/components/windows/bars/topBar";
import { FIRST_TOP_BAR } from "./topBar";

/**
 * The Verticopolis name carries its ™ mark everywhere the game shows it as a
 * name (owner, 2026-11-13). The splash wordmark's mark is pinned in
 * splashSponsor.test.ts; this file pins the in-game spots: the top bar's
 * VERTICOPOLIS badge (the components package draws it), the version line in
 * Settings and About this game, the page's fallback heading, and the window
 * titles of the sprite gallery and missing-page pages.
 */

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = readFileSync(resolve(srcRoot, "index.html"), "utf8");
const page = new DOMParser().parseFromString(indexHtml, "text/html");

describe("the in-game name badge", () => {
  it("reads VERTICOPOLIS™, with the mark in its own raised span after POLIS", () => {
    const bar = renderToFragment(topBarTemplate(FIRST_TOP_BAR, {} as TopBarActions));
    const brand = bar.querySelector(".brand")!;
    expect(brand.textContent!.trim()).toBe("VERTICOPOLIS™");
    const mark = brand.querySelector(".brand-tm")!;
    expect(mark.textContent).toBe("™");
    expect(mark.previousElementSibling?.textContent).toBe("POLIS");
  });

  it("marks the page's fallback heading the same way as its title", () => {
    expect(page.querySelector("h1")!.textContent).toMatch(/^Verticopolis™: /);
    expect(page.title).toMatch(/^Verticopolis™: /);
  });
});

describe("the version lines", () => {
  it("marks the name on the Settings version line", () => {
    const frag = renderToFragment(settingsTemplate("1.2.3"));
    expect(frag.querySelector(".set-version")!.textContent).toMatch(/^Verticopolis™ v1\.2\.3/);
  });

  it("marks the name on the About this game line", () => {
    const frag = renderToFragment(helpAboutBody("1.2.3"));
    expect(frag.textContent).toContain("Verticopolis™ v1.2.3");
  });
});

describe("the other pages' window titles", () => {
  it.each(["gallery.html", "404.html"])("marks the name in %s's title", (file) => {
    const doc = new DOMParser().parseFromString(readFileSync(resolve(srcRoot, file), "utf8"), "text/html");
    expect(doc.title).toMatch(/^Verticopolis™[ :]/);
  });
});
