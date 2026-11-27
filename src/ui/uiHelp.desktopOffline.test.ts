import { describe, expect, it, vi, afterEach } from "vitest";

/** The desktop build carries the manual on disk (src/build/desktopBuild.ts),
 *  so Help opens it offline even though no manual worker saved it; the web
 *  build still says the manual needs the internet the first time. The flag is
 *  replaced through `../deployTarget`. */

const { deploy, manual, track } = vi.hoisted(() => ({
  deploy: { desktop: true },
  manual: { isOpen: () => true, show: vi.fn(), whenClosed: vi.fn() },
  track: vi.fn(),
}));
vi.mock("../deployTarget", () => ({
  PREVIEW_DEPLOY: false,
  get DESKTOP_BUILD() {
    return deploy.desktop;
  },
}));
vi.mock("./desk/deskHelpWindow", () => ({ deskManual: () => manual }));
vi.mock("../analytics", () => ({ trackAppAction: track }));

const onLine = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine");

function offline(): void {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "onLine");
  if (onLine) Object.defineProperty(Navigator.prototype, "onLine", onLine);
  deploy.desktop = true;
  manual.show.mockClear();
  vi.resetModules();
});

describe("showHelp offline", () => {
  it("opens the manual in the desktop build", async () => {
    offline();
    const { showHelp } = await import("./uiHelp");
    const ui = { sayVisibly: vi.fn() };
    showHelp(ui as never, "game_menu");
    expect(manual.show).toHaveBeenCalledWith("/help/", "game_menu");
    expect(ui.sayVisibly).not.toHaveBeenCalled();
  });

  it("says the manual is not saved in the web build", async () => {
    deploy.desktop = false;
    offline();
    const { showHelp, MANUAL_NOT_SAVED } = await import("./uiHelp");
    const ui = { sayVisibly: vi.fn() };
    showHelp(ui as never, "game_menu");
    expect(ui.sayVisibly).toHaveBeenCalledWith(MANUAL_NOT_SAVED);
    expect(manual.show).not.toHaveBeenCalled();
  });
});
