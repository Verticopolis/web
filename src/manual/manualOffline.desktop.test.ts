import { describe, expect, it, vi, afterEach } from "vitest";

/** The desktop build registers no manual worker (src/build/desktopBuild.ts);
 *  the flag is replaced through `../deployTarget`. */

const deploy = vi.hoisted(() => ({ desktop: true }));
vi.mock("../deployTarget", () => ({
  PREVIEW_DEPLOY: false,
  get DESKTOP_BUILD() {
    return deploy.desktop;
  },
}));

function deps() {
  return {
    workers: {
      register: vi.fn(async () => ({ scope: "https://h/help/" })),
      ready: Promise.resolve({ scope: "https://h/help/" }),
    },
    doc: { cookie: "" },
    host: "h",
    track: vi.fn(),
  };
}

afterEach(() => {
  deploy.desktop = true;
});

describe("saveManualOffline in the desktop build", () => {
  it("registers no worker and counts nothing", async () => {
    const { saveManualOffline } = await import("./manualOffline");
    const d = deps();
    await saveManualOffline("/help", d);
    expect(d.workers.register).not.toHaveBeenCalled();
    expect(d.track).not.toHaveBeenCalled();
  });

  it("registers the manual's worker in the web build", async () => {
    deploy.desktop = false;
    const { saveManualOffline } = await import("./manualOffline");
    const d = deps();
    await saveManualOffline("/help", d);
    expect(d.workers.register).toHaveBeenCalledWith("/help/sw.js", { scope: "/help/" });
  });
});
