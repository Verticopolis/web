import { describe, it, expect, vi, afterEach } from "vitest";
import { html } from "lit-html";
import { mountPage } from "./testing/litTestUtils";
import type { HelpMenuDeps } from "./helpSiteMenu";

/**
 * The manual's menu bar in the desktop build (src/build/desktopBuild.ts):
 * Help offers no Sponsor item and no separator before it. The build-time
 * flag is replaced through `../deployTarget`.
 */

const deploy = vi.hoisted(() => ({ desktop: true }));
vi.mock("../deployTarget", () => ({
  PREVIEW_DEPLOY: false,
  get DESKTOP_BUILD() {
    return deploy.desktop;
  },
}));

function deps(): HelpMenuDeps {
  return {
    links: {
      game: "/",
      whatsNew: "/help/changelog/",
      report: "https://example.test/issues",
      sponsor: "https://example.test/sponsor",
    },
    fromGame: false,
    backToGame: vi.fn(),
    print: vi.fn(),
    openSearch: vi.fn(),
    copyLink: vi.fn(() => Promise.resolve()),
    pageUrl: () => "app://game/help/",
    theme: vi.fn(() => "auto" as const),
    setTheme: vi.fn(),
    track: vi.fn(),
  };
}

/** The Help menu's items, in order, as the bar draws them. */
async function helpItems(): Promise<string[]> {
  vi.resetModules();
  const { wireHelpMenu } = await import("./helpSiteMenu");
  mountPage(html`<div id="host"></div>`);
  const host = document.getElementById("host")!;
  wireHelpMenu(host, deps());
  const items = [...host.querySelectorAll<HTMLElement>("[data-help-item]")].map((e) => e.dataset.helpItem!);
  return items.slice(items.indexOf("whats_new"));
}

afterEach(() => {
  deploy.desktop = true;
});

describe("the manual's Help menu in the desktop build", () => {
  it("leaves out Sponsor", async () => {
    expect(await helpItems()).toEqual(["whats_new", "report"]);
  });

  it("keeps Sponsor in the web build", async () => {
    deploy.desktop = false;
    expect(await helpItems()).toEqual(["whats_new", "report", "sponsor"]);
  });
});
