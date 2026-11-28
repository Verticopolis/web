import type { Tower3dStats, Tower3dView } from "@verticopolis/components/render3d/Tower3dView";
import { measureRun } from "./tower3dMeasure";

const stats: Tower3dStats = {
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
  lastBuildMs: 4.2,
};

function fakeView() {
  return { orbitBy: vi.fn(), stats: vi.fn(() => stats) };
}

describe("measureRun", () => {
  let queued: FrameRequestCallback[] = [];
  const step = (now: number): void => {
    const run = queued;
    queued = [];
    for (const cb of run) cb(now);
  };

  beforeEach(() => {
    queued = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queued.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => (queued = []));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("turns the camera every frame and reports the frame rates once the time is up", () => {
    const view = fakeView();
    const done = vi.fn();
    measureRun(view as unknown as Tower3dView, 1000, done);
    // 16 ms frames, with every tenth one 40 ms.
    let now = 0;
    for (let i = 0; i <= 80 && !done.mock.calls.length; i++) step((now += i % 10 === 9 ? 40 : 16));
    expect(done).toHaveBeenCalledTimes(1);
    const report = done.mock.calls[0]![0];
    expect(report.fpsMedian).toBe(63);
    expect(report.fps5th).toBe(25);
    expect(report.frameP95).toBe(40);
    expect(view.orbitBy).toHaveBeenCalled();
    expect(report.text).toContain("Draw calls: 40 (bar under 150) pass");
    expect(report.text).toContain("5th percentile fps: 25");
    expect(report.text).toContain("FAIL");
    step(now + 16);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("reports nothing when stopped early", () => {
    const done = vi.fn();
    const stop = measureRun(fakeView() as unknown as Tower3dView, 1000, done);
    step(0);
    step(16);
    stop();
    step(5000);
    expect(done).not.toHaveBeenCalled();
  });
});
