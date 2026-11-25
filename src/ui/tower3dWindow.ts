/**
 * Tower > View in 3D… (5.x, Epic 1 prototype, draft only): a "Tower in 3D"
 * window that shows the player's own tower as a 3D model to orbit and zoom.
 * The 3D code (the components' `render3d/` subpath and three.js) loads with a
 * dynamic import the first time the window opens, into its own `tower3d`
 * chunk that the install precache leaves out (vite.config.ts), so a player
 * who never opens the window downloads and runs none of it.
 *
 * The window reads the same render model the side view reads and never
 * changes the tower. On a phone it fills the screen; on a computer it is a
 * window over the tower. The prototype's bar also carries the look picker and
 * the gate's Measure run (Stories 1.2 and 1.3 of the plan in
 * `_bmad-output/planning-artifacts/design/epics-tower-3d-view-2026-11-25.md`).
 */
import { html, nothing, render } from "lit-html";
import type { GameApp } from "../main";
import { towerCatalog } from "@verticopolis/components/render/towerSource";
import { MovableWindow } from "@verticopolis/components/windows/movableWindow";
import type {
  LookVariant,
  TimeChoice,
  Tower3dStats,
  Tower3dView,
  Unavailable,
} from "@verticopolis/components/render3d/Tower3dView";
import { renderRules, toRenderSim } from "../engineRender";
import { engineTrapped } from "../game/engineFault";
import { isEngineStopped, isSplashUp } from "../game/interactionState";
import { measureRun, type MeasureReport } from "./tower3dMeasure";

/** The menu item that opens the window. */
export const TOWER_3D_ITEM_ID = "mb-tower-3d";

const HOST_ID = "tower3d-host";

interface State {
  status: string;
  time: TimeChoice;
  variant: LookVariant;
  stats: Tower3dStats | null;
  report: MeasureReport | null;
  measuring: boolean;
}

let open: { close: () => void } | null = null;

/** Opens the window, or brings it forward when it is open. */
export function openTower3d(app: GameApp): void {
  const existing = document.getElementById(HOST_ID);
  if (open && existing) {
    existing.querySelector<HTMLCanvasElement>("canvas")?.focus();
    return;
  }
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.append(host);
  const phone = app.mobileMq.matches;
  const state: State = {
    status: "Loading 3D…",
    time: "follow",
    variant: "lit",
    stats: null,
    report: null,
    measuring: false,
  };
  let view: Tower3dView | null = null;
  let mover: MovableWindow | null = null;
  let statsTimer = 0;
  let resize: ResizeObserver | null = null;
  let stopMeasure: (() => void) | null = null;

  const close = (): void => {
    stopMeasure?.();
    window.clearInterval(statsTimer);
    resize?.disconnect();
    view?.dispose();
    view = null;
    mover?.dispose();
    render(nothing, host);
    host.remove();
    open = null;
  };
  open = { close };

  const unavailable = (why: Unavailable): void => {
    view?.dispose();
    view = null;
    state.status =
      why === "no-webgl2"
        ? "3D isn't available on this device."
        : "The 3D view stopped. Close the window and open it again to try again.";
    draw();
  };

  const picture = async (): Promise<void> => {
    const blob = await view?.capture(Math.min(2, devicePixelRatio || 1));
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${app.ui.el.towerName.value.trim() || "Tower"} in 3D.png`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const measure = (): void => {
    if (!view || state.measuring) return;
    state.measuring = true;
    state.report = null;
    draw();
    stopMeasure = measureRun(view, 60_000, (report) => {
      state.measuring = false;
      state.report = report;
      stopMeasure = null;
      draw();
    });
  };

  const winStyle = phone
    ? "position:fixed;inset:0;z-index:900;display:flex;flex-direction:column"
    : "position:fixed;left:8vw;top:8vh;width:84vw;height:80vh;z-index:900;display:flex;flex-direction:column";

  function draw(): void {
    const s = state.stats;
    render(
      html`<section
        class="win tower3d-win"
        role="dialog"
        aria-labelledby="tower3d-title"
        style=${winStyle}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Escape") close();
        }}
      >
        <div class="win-title">
          <span id="tower3d-title">Tower in 3D</span
          ><button type="button" class="btn xs" aria-label="Close Tower in 3D" @click=${close}>✕</button>
        </div>
        <div class="tower3d-bar" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:4px">
          <label
            >Time
            <select
              @change=${(e: Event) => {
                state.time = (e.target as HTMLSelectElement).value as TimeChoice;
                view?.setTimeOfDay(state.time);
              }}
            >
              <option value="follow" ?selected=${state.time === "follow"}>Follow the clock</option>
              <option value="day" ?selected=${state.time === "day"}>Day</option>
              <option value="dusk" ?selected=${state.time === "dusk"}>Dusk</option>
              <option value="night" ?selected=${state.time === "night"}>Night</option>
            </select></label
          >
          <label
            >Look
            <select
              @change=${(e: Event) => {
                state.variant = (e.target as HTMLSelectElement).value as LookVariant;
                view?.setVariant(state.variant);
              }}
            >
              <option value="lit" ?selected=${state.variant === "lit"}>A: Lit model</option>
              <option value="pastel" ?selected=${state.variant === "pastel"}>B: Flat pastel</option>
              <option value="night" ?selected=${state.variant === "night"}>C: Night first</option>
            </select></label
          >
          <button type="button" class="btn" @click=${() => view?.resetView()}>Reset view</button>
          <button type="button" class="btn" @click=${() => void picture()}>Take a picture</button>
          <button type="button" class="btn" ?disabled=${state.measuring || !view} @click=${measure}>
            ${state.measuring ? "Measuring (60 s)…" : "Measure"}
          </button>
        </div>
        <div style="position:relative;flex:1;min-height:0;background:#000">
          <canvas
            tabindex="0"
            aria-label="Your tower in 3D. Drag to turn it, scroll or pinch to zoom, Shift and drag to pan, Home to reset."
            style="width:100%;height:100%;display:block;touch-action:none"
          ></canvas>
          ${
            state.status
              ? html`<p style="position:absolute;inset:0;margin:auto;height:2em;text-align:center;color:#fff">
                ${state.status}
              </p>`
              : nothing
          }
          ${
            s
              ? html`<pre
                style="position:absolute;left:4px;bottom:4px;margin:0;padding:4px;font:11px monospace;color:#fff;background:#0009;pointer-events:none"
              >
${statsLine(s)}</pre
              >`
              : nothing
          }
          ${
            state.report
              ? html`<div class="win" style="position:absolute;right:8px;top:8px;max-width:min(90%,420px);padding:6px">
                <pre style="margin:0;white-space:pre-wrap;font:11px monospace">${state.report.text}</pre>
                <button type="button" class="btn" @click=${() => void navigator.clipboard?.writeText(state.report!.text)}>
                  Copy numbers
                </button>
              </div>`
              : nothing
          }
        </div>
      </section>`,
      host,
    );
  }

  draw();
  const win = host.querySelector<HTMLElement>(".tower3d-win")!;
  const canvas = host.querySelector<HTMLCanvasElement>("canvas")!;
  if (!phone) mover = new MovableWindow({ win, title: ".win-title", within: null });

  void import("@verticopolis/components/render3d/Tower3dView").then(
    ({ Tower3dView }) => {
      if (open?.close !== close) return;
      const sim = toRenderSim(app.renderSim);
      view = Tower3dView.mount(canvas, {
        sim: () => {
          // The tower closed, or the engine stopped or trapped: nothing more to read, so close.
          if (isSplashUp() || engineTrapped() || isEngineStopped()) queueMicrotask(close);
          return sim;
        },
        catalog: towerCatalog(sim),
        rules: renderRules,
        onUnavailable: unavailable,
      });
      if (!view) return;
      state.status = "";
      draw();
      canvas.focus();
      resize = new ResizeObserver(() => view?.resize(canvas.clientWidth, canvas.clientHeight));
      resize.observe(canvas);
      statsTimer = window.setInterval(() => {
        if (!view) return;
        state.stats = view.stats();
        draw();
      }, 1000);
    },
    () => {
      state.status = "Couldn't load the 3D view. Check your connection and try again.";
      draw();
    },
  );
}

/** Closes the window if it is open (a tower closing, say). */
export function closeTower3d(): void {
  open?.close();
}

function statsLine(s: Tower3dStats): string {
  const fps = s.frameP50 > 0 ? Math.round(1000 / s.frameP50) : 0;
  return `${fps} fps · ${s.drawCalls} draws · ${Math.round(s.triangles / 1000)}k tris · ${s.people} people · ${s.tier}`;
}
