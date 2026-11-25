/**
 * The gate's Measure run for the Tower in 3D prototype (Story 1.2 of
 * `_bmad-output/planning-artifacts/design/epics-tower-3d-view-2026-11-25.md`):
 * the camera sweeps around the tower for a fixed time while every frame's
 * length is recorded, then the run reports the numbers the gate reads, as
 * text the player copies into the results file.
 */
import type { Tower3dStats, Tower3dView } from "@verticopolis/components/render3d/Tower3dView";

/** What one run found. */
export interface MeasureReport {
  readonly fpsMedian: number;
  readonly fps5th: number;
  readonly frameP90: number;
  readonly frameP95: number;
  readonly frames: number;
  readonly stats: Tower3dStats;
  /** The copyable block. */
  readonly text: string;
}

/** The gate's bar for one device class (the epic's Story 1.2 table). */
interface Bar {
  readonly fpsMedian: number;
  readonly fps5th: number;
}

const BARS: Readonly<Record<"phone" | "other", Bar>> = {
  phone: { fpsMedian: 60, fps5th: 45 },
  other: { fpsMedian: 60, fps5th: 50 },
};
const MAX_DRAW_CALLS = 150;
const MAX_HEAP_MB = 150;
/** One full sweep, left to right and back, takes this long. */
const SWEEP_MS = 20_000;
/** How far the sweep turns either side of straight on (radians). */
const SWEEP_THETA = 1.1;

/**
 * Starts a run of `ms` on `view`. Calls `done` once with the report, and
 * returns a function that stops the run early without reporting.
 */
export function measureRun(view: Tower3dView, ms: number, done: (report: MeasureReport) => void): () => void {
  const frames: number[] = [];
  let start = -1;
  let last = -1;
  let theta = 0;
  let raf = 0;
  let stopped = false;

  const tick = (now: number): void => {
    if (stopped) return;
    if (start < 0) start = now;
    else frames.push(now - last);
    last = now;
    const target = SWEEP_THETA * Math.sin((2 * Math.PI * (now - start)) / SWEEP_MS);
    view.orbitBy(target - theta);
    theta = target;
    if (now - start >= ms) {
      stopped = true;
      done(report(frames, view.stats()));
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

function report(frames: readonly number[], stats: Tower3dStats): MeasureReport {
  const sorted = [...frames].sort((a, b) => a - b);
  const at = (p: number): number =>
    sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]! : 0;
  const fps = (frameMs: number): number => (frameMs > 0 ? Math.round(1000 / frameMs) : 0);
  const fpsMedian = fps(at(50));
  // The 5th-percentile frame rate is the 95th-percentile frame length.
  const fps5th = fps(at(95));
  const frameP90 = round1(at(90));
  const frameP95 = round1(at(95));
  const phone = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 600;
  const bar = BARS[phone ? "phone" : "other"];
  const heap = heapMb();
  const pass = (ok: boolean): string => (ok ? "pass" : "FAIL");
  const lines = [
    "Tower in 3D, Measure run",
    `When: ${new Date().toISOString()}`,
    `Device: ${navigator.userAgent}`,
    `Screen: ${screen.width}x${screen.height} CSS px, ratio ${devicePixelRatio}, canvas ratio ${stats.pixelRatio}`,
    `Cores: ${navigator.hardwareConcurrency || "?"}  Class: ${phone ? "phone" : "tablet or computer"}`,
    `Tier: ${stats.tier}  People drawn: ${stats.people}  Cars: ${stats.cars}  Bands: ${stats.bands}`,
    `Frames: ${frames.length}`,
    `Median fps: ${fpsMedian} (bar ${bar.fpsMedian}) ${pass(fpsMedian >= bar.fpsMedian - 1)}`,
    `5th percentile fps: ${fps5th} (bar ${bar.fps5th}) ${pass(fps5th >= bar.fps5th)}`,
    `Frame p90 / p95: ${frameP90} / ${frameP95} ms`,
    `Draw calls: ${stats.drawCalls} (bar under ${MAX_DRAW_CALLS}) ${pass(stats.drawCalls < MAX_DRAW_CALLS)}`,
    `Triangles: ${stats.triangles}  Geometries: ${stats.geometries}  Slowest band build: ${round1(stats.lastBuildMs)} ms`,
    heap === null
      ? "JS heap: not reported by this browser (read it from the browser's memory tools)"
      : `JS heap: ${heap} MB (bar under ${MAX_HEAP_MB}) ${pass(heap < MAX_HEAP_MB)}`,
  ];
  return { fpsMedian, fps5th, frameP90, frameP95, frames: frames.length, stats, text: lines.join("\n") };
}

function heapMb(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? Math.round(memory.usedJSHeapSize / 1048576) : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
