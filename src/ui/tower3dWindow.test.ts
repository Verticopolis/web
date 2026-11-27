import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameApp } from "../main";

const view = vi.hoisted(() => ({
  setTimeOfDay: vi.fn(),
  setVariant: vi.fn(),
  resetView: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  peopleWindow: vi.fn(() => ({ floorLo: 2, floorHi: 30, xLo: 0, xHi: 375 })),
  capture: vi.fn(async () => new Blob(["png"]) as Blob | null),
  stats: vi.fn(() => ({
    tier: "high",
    frameP50: 16,
    frameP90: 17,
    frameP95: 18,
    drawCalls: 40,
    triangles: 290_000,
    geometries: 30,
    bands: 15,
    people: 2000,
    cars: 60,
    pixelRatio: 2,
    lastBuildMs: 4,
  })),
}));
const three = vi.hoisted(() => ({ mount: vi.fn() }));
const guards = vi.hoisted(() => ({ splash: false, trapped: false, stopped: false }));
const measure = vi.hoisted(() => ({ run: vi.fn(), stop: vi.fn() }));
const mover = vi.hoisted(() => ({ make: vi.fn(), dispose: vi.fn() }));

vi.mock("@verticopolis/components/render3d/Tower3dView", () => ({ Tower3dView: { mount: three.mount } }));
vi.mock("@verticopolis/components/windows/movableWindow", () => ({
  MovableWindow: class {
    constructor(opts: unknown) {
      mover.make(opts);
    }
    dispose = mover.dispose;
  },
}));
vi.mock("@verticopolis/components/render/towerSource", () => ({ towerCatalog: () => "catalog" }));
vi.mock("../engineRender", () => ({ toRenderSim: (s: unknown) => ({ wrapped: s }), renderRules: "rules" }));
vi.mock("../game/engineFault", () => ({ engineTrapped: () => guards.trapped }));
vi.mock("../game/interactionState", () => ({
  isSplashUp: () => guards.splash,
  isEngineStopped: () => guards.stopped,
}));
vi.mock("./tower3dMeasure", () => ({ measureRun: measure.run }));

import { closeTower3d, openTower3d, tower3dPeopleWindow } from "./tower3dWindow";

interface MountOptions {
  sim: () => unknown;
  catalog: unknown;
  rules: unknown;
  onUnavailable: (why: string) => void;
}

function fakeApp(phone = false): GameApp {
  return {
    mobileMq: { matches: phone },
    renderSim: "reader",
    ui: { el: { towerName: { value: " Harmony " } } },
  } as unknown as GameApp;
}

const host = (): HTMLElement | null => document.getElementById("tower3d-host");
const button = (label: string): HTMLButtonElement =>
  [...host()!.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(label))!;
const mountOptions = (): MountOptions => three.mount.mock.calls[three.mount.mock.calls.length - 1]![1] as MountOptions;

async function opened(phone = false): Promise<void> {
  openTower3d(fakeApp(phone));
  await vi.waitFor(() => expect(three.mount).toHaveBeenCalled());
}

describe("Tower in 3D window", () => {
  let observed: (() => void) | null;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(guards, { splash: false, trapped: false, stopped: false });
    three.mount.mockReturnValue(view);
    measure.run.mockReturnValue(measure.stop);
    observed = null;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          observed = cb;
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
  });
  afterEach(() => {
    closeTower3d();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("mounts the 3D view on the window's canvas with the live tower, and is movable on a computer", async () => {
    await opened();
    const [canvas, options] = three.mount.mock.calls[0]! as [HTMLCanvasElement, MountOptions];
    expect(canvas).toBe(host()!.querySelector("canvas"));
    expect(options.sim()).toEqual({ wrapped: "reader" });
    expect(options.catalog).toBe("catalog");
    expect(options.rules).toBe("rules");
    expect(mover.make).toHaveBeenCalledWith(expect.objectContaining({ title: ".win-title" }));
    expect(host()!.textContent).not.toContain("Loading 3D");
    observed!();
    expect(view.resize).toHaveBeenCalled();
  });

  it("asks for people across the floors it shows while open, and none once closed", async () => {
    expect(tower3dPeopleWindow()).toBeNull();
    await opened();
    expect(mountOptions()).toEqual(expect.objectContaining({ variant: "art" }));
    expect(tower3dPeopleWindow()).toEqual({ floorLo: 2, floorHi: 30, xLo: 0, xHi: 375 });
    closeTower3d();
    expect(tower3dPeopleWindow()).toBeNull();
  });

  it("fills the screen without a mover on a phone, and a second open keeps the one window", async () => {
    await opened(true);
    expect(mover.make).not.toHaveBeenCalled();
    openTower3d(fakeApp(true));
    expect(document.querySelectorAll("#tower3d-host")).toHaveLength(1);
    expect(three.mount).toHaveBeenCalledTimes(1);
  });

  it("passes the time, look and reset controls to the view", async () => {
    await opened();
    const [time, look] = host()!.querySelectorAll("select");
    time!.value = "night";
    time!.dispatchEvent(new Event("change"));
    look!.value = "pastel";
    look!.dispatchEvent(new Event("change"));
    button("Reset view").click();
    expect(view.setTimeOfDay).toHaveBeenCalledWith("night");
    expect(view.setVariant).toHaveBeenCalledWith("pastel");
    expect(view.resetView).toHaveBeenCalled();
  });

  it("shows the view's numbers once a second", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    await opened();
    vi.advanceTimersByTime(1000);
    expect(host()!.querySelector("pre")!.textContent).toContain("63 fps · 40 draws · 290k tris · 2000 people · high");
  });

  it("saves a picture named after the tower", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });
    await opened();
    button("Take a picture").click();
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe("Harmony in 3D.png");
    click.mockRestore();
  });

  it("runs Measure for 60 seconds and shows the report to copy", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await opened();
    button("Measure").click();
    expect(measure.run).toHaveBeenCalledWith(view, 60_000, expect.any(Function));
    expect(button("Measuring").disabled).toBe(true);
    measure.run.mock.calls[0]![2]({ text: "Median fps: 60" });
    expect(host()!.textContent).toContain("Median fps: 60");
    button("Copy numbers").click();
    expect(writeText).toHaveBeenCalledWith("Median fps: 60");
  });

  it("says so when the device has no WebGL 2, and drops the view", async () => {
    await opened();
    mountOptions().onUnavailable("no-webgl2");
    expect(view.dispose).toHaveBeenCalled();
    expect(host()!.textContent).toContain("3D isn't available on this device.");
  });

  it("says the view stopped when the context is lost", async () => {
    await opened();
    mountOptions().onUnavailable("context-lost");
    expect(host()!.textContent).toContain("The 3D view stopped.");
  });

  it("stays on its message when the view cannot mount", async () => {
    three.mount.mockReturnValue(null);
    await opened();
    expect(host()!.textContent).toContain("Loading 3D");
  });

  it("closes itself once the tower closes", async () => {
    await opened();
    guards.splash = true;
    mountOptions().sim();
    await vi.waitFor(() => expect(host()).toBeNull());
    expect(view.dispose).toHaveBeenCalled();
  });

  it("closes on Escape and on its close button, stopping a measure run", async () => {
    await opened();
    button("Measure").click();
    host()!
      .querySelector("section")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(host()).toBeNull();
    expect(measure.stop).toHaveBeenCalled();
    expect(mover.dispose).toHaveBeenCalled();
    await opened();
    host()!.querySelector<HTMLButtonElement>("[aria-label='Close Tower in 3D']")!.click();
    expect(host()).toBeNull();
  });
});
