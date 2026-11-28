import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * The desktop build (src/build/desktopBuild.ts): with the flag on, the page
 * registers no service worker, offers no Install, shows no Sponsor link and
 * loads no Vercel page scripts, even on the production host where all four
 * normally run, while its events still go to `/api/ingest` on whatever host
 * serves it (an `app:` page included). The build-time flag is replaced through `./deployTarget`, as
 * pwaPreview.test.ts does for previews.
 */

const { registerSW, deploy, injectSpeedInsights, injectWebAnalytics } = vi.hoisted(() => ({
  registerSW: vi.fn((_opts: Record<string, unknown>) => vi.fn()),
  deploy: { desktop: true },
  injectSpeedInsights: vi.fn(),
  injectWebAnalytics: vi.fn(),
}));
vi.mock("virtual:pwa-register", () => ({ registerSW }));
vi.mock("@vercel/speed-insights", () => ({ injectSpeedInsights }));
vi.mock("@vercel/analytics", () => ({ inject: injectWebAnalytics }));
vi.mock("./deployTarget", () => ({
  PREVIEW_DEPLOY: false,
  get DESKTOP_BUILD() {
    return deploy.desktop;
  },
}));

const startUrl = window.location.href;

/** A secure page on the production host with service worker support and an
 *  empty registration list; returns a function that undoes it. */
function productionPage(): () => void {
  const originalSecure = Object.getOwnPropertyDescriptor(window, "isSecureContext");
  const originalSw = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistrations: vi.fn(async () => []) },
  });
  window.location.href = "https://verticopolis.com/";
  window.matchMedia = vi.fn((q: string) => ({ matches: false, media: q }) as MediaQueryList);
  return () => {
    for (const [target, key, original] of [
      [window, "isSecureContext", originalSecure],
      [navigator, "serviceWorker", originalSw],
    ] as const) {
      if (original) Object.defineProperty(target, key, original);
      else Reflect.deleteProperty(target, key);
    }
    window.location.href = startUrl;
  };
}

afterEach(() => {
  registerSW.mockClear();
  injectSpeedInsights.mockClear();
  injectWebAnalytics.mockClear();
  deploy.desktop = true;
  vi.resetModules();
});

describe("the desktop build", () => {
  it("registers no service worker and starts no update poll", async () => {
    const restore = productionPage();
    const setInterval = vi.spyOn(window, "setInterval");
    try {
      const { registerPWA } = await import("./pwa");
      registerPWA({ onUpdateAvailable: vi.fn() });
      expect(registerSW).not.toHaveBeenCalled();
      expect(setInterval).not.toHaveBeenCalled();
    } finally {
      setInterval.mockRestore();
      restore();
    }
  });

  it("loads no Vercel page scripts on the production host", async () => {
    const restore = productionPage();
    try {
      const { injectPageTelemetry } = await import("./telemetry");
      injectPageTelemetry();
      expect(injectSpeedInsights).not.toHaveBeenCalled();
      expect(injectWebAnalytics).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it("sends events from a host the web gate would refuse", async () => {
    window.location.href = "http://localhost:3000/";
    try {
      const { telemetryHostAllowed } = await import("./telemetry");
      expect(telemetryHostAllowed()).toBe(true);
    } finally {
      window.location.href = startUrl;
    }
  });

  it("reports its events as the desktop platform", async () => {
    const { platformLabel, distributionChannelLabel } = await import("./analyticsEnrichment");
    expect(platformLabel()).toBe("desktop");
    expect(distributionChannelLabel(platformLabel())).toBe("desktop");
  });

  it("counts as installed, so no surface offers Install", async () => {
    const restore = productionPage();
    try {
      const { isStandalone, installAvailability } = await import("./pwaInstall");
      const { splashInstallOffered } = await import("./game/installAffordance");
      expect(isStandalone()).toBe(true);
      expect(installAvailability()).toBe("none");
      expect(splashInstallOffered()).toBe(false);
    } finally {
      restore();
    }
  });

  it("shows no Sponsor link", async () => {
    const restore = productionPage();
    try {
      const { sponsorOffered } = await import("./ui/splashTemplate");
      expect(sponsorOffered()).toBe(false);
    } finally {
      restore();
    }
  });

  it("leaves all four on in the web build", async () => {
    deploy.desktop = false;
    const restore = productionPage();
    try {
      const { registerPWA } = await import("./pwa");
      registerPWA({ onUpdateAvailable: vi.fn() });
      expect(registerSW).toHaveBeenCalledTimes(1);
      const telemetry = await import("./telemetry");
      expect(telemetry.telemetryHostAllowed()).toBe(true);
      telemetry.injectPageTelemetry();
      expect(injectSpeedInsights).toHaveBeenCalledTimes(1);
      expect(injectWebAnalytics).toHaveBeenCalledTimes(1);
      expect((await import("./analyticsEnrichment")).platformLabel()).toBe("web");
      expect((await import("./pwaInstall")).isStandalone()).toBe(false);
      expect((await import("./game/installAffordance")).splashInstallOffered()).toBe(true);
      expect((await import("./ui/splashTemplate")).sponsorOffered()).toBe(true);
    } finally {
      restore();
    }
  });
});
