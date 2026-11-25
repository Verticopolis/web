import { describe, expect, it, beforeEach, vi } from "vitest";
import { inflateSync } from "fflate";
import { FLOOR, TILE, TowerEngine } from "@verticopolis/components/render/excalibur/TowerEngine";
import { viewWorld } from "@verticopolis/components/presentation/viewWorld";
import type { SerializedGame, SerializedView } from "@verticopolis/engine/model/types";
import { SKY_HEADROOM_FLOORS } from "@verticopolis/components/render/cameraBounds";
import { SaveLoad } from "../../game/saveLoad";
import { tdtFile } from "../conformance/tdtWasm";
import { hasWasmPackage } from "../conformance/wasmEngine";
import { loadAuto, withPorts } from "../fixtures/saveText";
import { draftTower, type Draft } from "../portKit/drafts";
import { noEngine } from "../portKit/rustEngine";
import type { EnginePort } from "@verticopolis/engine/port/enginePort";

/** The view a tower's save carries. */
const viewOf = (sim: Draft | null): SerializedView | undefined => sim?.serialize().view;

/**
 * View-state save parity: the camera (tile/floor/zoom) rides inside every
 * save so a tower moved between devices reopens where its player was
 * standing, matching what the 1994 TDT header already carries at 0x26/0x28.
 * See _bmad-output/implementation-artifacts/story-view-state-save-parity.md.
 * How a loaded view is checked (kept as written, dropped when malformed,
 * clamped onto the lot) is pinned by the engine's own tests in
 * src/load/coerce.rs.
 */

/** Decode a binary `.vctower` (`VCTOWER2`, a newline, the raw deflate bytes)
 *  without DecompressionStream (env-agnostic). */
function decodeVctower(file: Uint8Array): SerializedGame {
  expect(new TextDecoder().decode(file.subarray(0, 9))).toBe("VCTOWER2\n");
  return JSON.parse(new TextDecoder().decode(inflateSync(file.subarray(9)))) as SerializedGame;
}

describe.skipIf(noEngine)("SaveLoad stamps the live camera onto the CURRENT tower's saves", () => {
  const camera: SerializedView = { tile: 42, floor: 3, zoom: 1.5 };
  let sim: Draft;
  let adopted: Draft[];
  let importReports: { open: () => void }[];
  let saveLoad: SaveLoad;

  beforeEach(() => {
    localStorage.clear();
    document.getElementById("splash")?.remove();
    sim = draftTower();
    adopted = [];
    importReports = [];
    saveLoad = new SaveLoad(
      withPorts({
        getSim: () => sim,
        getView: () => ({ ...camera }),
        adoptSim: (s) => {
          // The app follows the adopted tower, as GameApp.adoptSim does.
          adopted.push(s);
          sim = s;
        },
        ui: {
          toast: () => {},
          sayVisibly: vi.fn(),
          downloadFile: () => true,
          showImportReport: (_report, cb) => importReports.push({ open: cb.onOpen }),
          showExportReport: () => {},
        },
        showCrashScreen: () => {},
        showRecoveryWait: () => () => {},
        attemptGraphicsRecovery: () => {},
        armOnboarding: () => {},
      }),
    );
  });

  it("save() stamps the view; the reloaded autosave carries it", () => {
    saveLoad.save(true);
    expect(viewOf(loadAuto())).toEqual(camera);
  });

  it("a null camera (headless) stamps nothing and never erases a view the sim already carries", () => {
    // e.g. brought over by a TDT import: the engine holds the camera
    (sim.port as unknown as EnginePort).setCamera(7, 8, NaN);
    saveLoad = new SaveLoad(
      withPorts({
        getSim: () => sim,
        getView: () => null,
        adoptSim: () => {},
        ui: {
          toast: () => {},
          sayVisibly: () => {},
          downloadFile: () => true,
          showImportReport: () => {},
          showExportReport: () => {},
        },
        showCrashScreen: () => {},
        showRecoveryWait: () => () => {},
        attemptGraphicsRecovery: () => {},
        armOnboarding: () => {},
      }),
    );
    saveLoad.save(true);
    expect(viewOf(sim)).toEqual({ tile: 7, floor: 8 });
    expect(viewOf(loadAuto())).toEqual({ tile: 7, floor: 8 });
  });

  it("autosave() stamps the view on the async path too", async () => {
    await saveLoad.autosave();
    expect(viewOf(loadAuto())).toEqual(camera);
  });

  it("exportGame() stamps the view into the .vctower payload", async () => {
    let file: Uint8Array = new Uint8Array();
    saveLoad = new SaveLoad(
      withPorts({
        getSim: () => sim,
        getView: () => ({ ...camera }),
        adoptSim: () => {},
        ui: {
          toast: () => {},
          sayVisibly: vi.fn(),
          downloadFile: (_name, contents) => {
            file = contents as Uint8Array;
            return true;
          },
          showImportReport: () => {},
          showExportReport: () => {},
        },
        showCrashScreen: () => {},
        showRecoveryWait: () => () => {},
        attemptGraphicsRecovery: () => {},
        armOnboarding: () => {},
      }),
    );
    await saveLoad.exportGame();
    expect(decodeVctower(file).view).toEqual(camera);
  });

  it.skipIf(!hasWasmPackage())(
    "importLegacy: the imported sim keeps the TDT file's view, never the live camera's; the pre-adopt flush keeps the live one",
    async () => {
      const buf = tdtFile({ view: { tile: 200, floor: 20 } });
      await saveLoad.importLegacy(buf.buffer as ArrayBuffer, "MOVED.TDT");
      importReports[0].open();
      // The adopted tower carries the FILE's view (zoomless, fractional: the
      // words quantize to 8px/36px). My Towers keeps the 1994 file's own bytes.
      expect(viewOf(adopted[0])!.zoom).toBeUndefined();
      expect(viewOf(adopted[0])!.tile).toBeCloseTo(200, 1);
      expect(viewOf(adopted[0])!.floor).toBeCloseTo(20, 1);
      // The previous tower's autosave flush carries the live camera.
      expect(viewOf(loadAuto())).toEqual(camera);
    },
  );
});

describe("TowerEngine camera restore (prototype on a fake: no canvas)", () => {
  /** Minimal fake on the real prototype, carrying just the fields the camera
   *  methods reach through the getters (cam, viewWidth/viewHeight) and
   *  center(). No canvas or WebGL is ever touched. */
  function fakeEngine(highestFloor = 40) {
    const fake = Object.create(TowerEngine.prototype);
    fake.engine = {
      currentScene: { camera: { pos: { x: 0, y: 0 }, zoom: 0.9 } },
      screen: { resolution: { width: 800, height: 600 } },
    };
    fake.sim = { tower: { highestFloor } };
    return fake;
  }
  const proto = TowerEngine.prototype as any;

  it("viewState() and applyView() are exact inverses on the same device", () => {
    const fake = fakeEngine();
    proto.applyView.call(fake, { tile: 123.5, floor: 42.25, zoom: 1.7 });
    const cam = fake.engine.currentScene.camera;
    expect(cam.pos.x).toBeCloseTo(123.5 * TILE, 6);
    expect(cam.pos.y).toBeCloseTo(-42.25 * FLOOR, 6);
    expect(cam.zoom).toBe(1.7);
    expect(proto.viewState.call(fake)).toEqual({ tile: 123.5, floor: 42.25, zoom: 1.7 });
  });

  it("applyView clamps a foreign view to THIS device's legal camera (zoom range + world bounds)", () => {
    const fake = fakeEngine();
    proto.applyView.call(fake, { tile: 100, floor: 20, zoom: 99 });
    expect(fake.engine.currentScene.camera.zoom).toBe(3); // MAX_ZOOM
    // A view over the top of the world pulls back inside the vertical bounds
    // (the sky ceiling derives from the crane height; see cameraBounds).
    proto.applyView.call(fake, { tile: 100, floor: viewWorld().maxFloor, zoom: 0.3 });
    const cam = fake.engine.currentScene.camera;
    expect(cam.pos.y).toBeGreaterThanOrEqual(-(viewWorld().maxFloor + SKY_HEADROOM_FLOORS) * FLOOR + 600 / 2 / 0.3);
  });

  it("a zoomless view (TDT import) keeps the session's current zoom", () => {
    const fake = fakeEngine();
    fake.engine.currentScene.camera.zoom = 1.4;
    proto.applyView.call(fake, { tile: 50, floor: 10 });
    expect(fake.engine.currentScene.camera.zoom).toBe(1.4);
  });

  it("adoptCamera policy: view restores, no view centers, keepCamera (a tooling restore) leaves the camera alone", () => {
    const fake: any = fakeEngine();
    fake.applyView = vi.fn();
    fake.center = vi.fn();
    proto.adoptCamera.call(fake, { tile: 1, floor: 2 });
    expect(fake.applyView).toHaveBeenCalledExactlyOnceWith({ tile: 1, floor: 2 });
    expect(fake.center).not.toHaveBeenCalled();

    proto.adoptCamera.call(fake, null);
    expect(fake.center).toHaveBeenCalledTimes(1);

    fake.applyView.mockClear();
    fake.center.mockClear();
    proto.adoptCamera.call(fake, { tile: 1, floor: 2 }, true);
    expect(fake.applyView).not.toHaveBeenCalled();
    expect(fake.center).not.toHaveBeenCalled();
  });
});

describe("TowerEngine gesture zoom floor (prototype on a fake: no canvas)", () => {
  /** A fake carrying just what dynamicMinZoom/clampGestureZoom reach: the
   *  camera zoom, the viewport height, and the tower's built floor extent. */
  function fake(zoom: number, highestFloor: number, lowestFloor = 1, height = 700) {
    const f: any = Object.create(TowerEngine.prototype);
    f.engine = {
      currentScene: { camera: { pos: { x: 0, y: 0 }, zoom } },
      screen: { resolution: { width: 400, height } },
    };
    f.sim = { tower: { highestFloor, lowestFloor } };
    return f;
  }
  const proto = TowerEngine.prototype as any;

  it("stops zoom-OUT exactly at the tower-aware floor (no drift into void)", () => {
    const f = fake(0.9, 90); // a 90-floor tower, resting at the default zoom
    const lo = proto.dynamicMinZoom.call(f);
    expect(lo).toBeLessThan(0.9); // the floor is further out than the resting view
    // Pinching hard toward zero lands on the floor, never below it.
    expect(proto.clampGestureZoom.call(f, 1e-4)).toBeCloseTo(lo, 10);
  });

  it("counts basements: a deep tower's floor sits further out than a shallow one", () => {
    const shallow = proto.dynamicMinZoom.call(fake(0.9, 50)); // floors 1..50
    const deep = proto.dynamicMinZoom.call(fake(0.9, 50, -9)); // plus B1..B10
    expect(deep).toBeLessThan(shallow);
  });

  it("never FORCES a zoom-in when the camera is already below the floor", () => {
    // Small tower -> a high floor (~0.4). The camera sits well below it at 0.1,
    // as it would after rotating from a shorter landscape viewport or loading a
    // save whose zoom was set on a different device.
    const f = fake(0.1, 5);
    const lo = proto.dynamicMinZoom.call(f);
    expect(lo).toBeGreaterThan(0.1); // precondition: camera is below the floor
    // A pinch-OUT must not snap the camera INWARD to the floor; it holds instead.
    expect(proto.clampGestureZoom.call(f, 0.1 * 0.9)).toBeCloseTo(0.1, 10);
    // A pinch-IN eases toward the floor smoothly, honoring the exact request.
    expect(proto.clampGestureZoom.call(f, 0.1 * 1.2)).toBeCloseTo(0.12, 10);
  });

  it("re-engages the normal floor once the camera climbs back above it", () => {
    // Same small tower on a shorter viewport (floor ~0.38), camera now above the
    // floor at 0.5: the full tower-aware floor applies again, stopping further
    // zoom-out at lo rather than letting the camera drift on out.
    const f = fake(0.5, 5, 1, 500);
    const lo = proto.dynamicMinZoom.call(f);
    expect(lo).toBeLessThan(0.5);
    expect(proto.clampGestureZoom.call(f, 1e-4)).toBeCloseTo(lo, 10);
  });
});
