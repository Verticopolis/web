import { vi } from "vitest";
import type { GameApp } from "../main";
import { PortCodes } from "@verticopolis/engine/port/portCodes";
import { mockPort, record } from "../tests/portKit/mockPort";
import { html } from "lit-html";
import { drawElement } from "../ui/testing/litTestUtils";

/** The fake app `engineWiring.test.ts` wires: every hook the engine callbacks
 *  reach, as vi.fn spies, over a mock port. */

export interface FakeEngine {
  classifyDown?: (...a: unknown[]) => unknown;
  spacePanKey?: (press?: Event) => boolean;
  onTap?: (tile: number, floor: number, touch: boolean, pick: () => unknown, world?: unknown) => void;
  onActionDown?: (tile: number, floor: number, touch: boolean, pick: () => unknown) => void;
  onActionMove?: (tile: number, floor: number, pick: () => unknown) => void;
  onActionUp?: () => void;
  onHover?: (tile: number, floor: number, pick: () => unknown) => void;
  onLongPress?: (tile: number, floor: number, pick: () => unknown) => void;
  onLongPressEnd?: () => void;
  onSecondary?: (pick: () => unknown) => void;
  onExtendTo?: (end: unknown, target: unknown) => void;
  onExtendEnd?: () => void;
  onUpdate?: (ms: number) => void;
  onFrameError?: (err: unknown) => void;
  halted?: boolean;
  onContextLost?: () => void;
  preview?: unknown;
  transportPreview?: unknown;
}

/** Let the settled command promises run their follow-ups (the undo commit). */
export const flush = () => new Promise((r) => setTimeout(r, 0));

export function makeApp(toolOver: Record<string, unknown> = {}) {
  const engine: FakeEngine = {};
  const canvas = drawElement<HTMLCanvasElement>(html`<canvas></canvas>`);
  // A drag latch (generation) and a shaft quote; the real answers: shaftPreview.integration.test.ts.
  const enginePort = mockPort({
    generation: () => 1,
    quoteShaft: () => record("quoteShaft", { ok: 1 }),
    lastReason: () => undefined,
  });
  const portCodes = new PortCodes(mockPort());
  const reader = { unlocked: vi.fn(() => true), header: { mode: "classic" } };
  const app = {
    engine,
    enginePort,
    portCodes,
    reader,
    canvas,
    audio: { start: vi.fn() },
    keyboard: { pointerDrew: vi.fn(), followTower: vi.fn() },
    tool: { type: "inspect", kind: "office", ...toolOver },
    build: {
      bulldozePicked: vi.fn(async () => {}),
      clearPaint: vi.fn(),
      seedPaint: vi.fn(async () => {}),
      paintFloorRun: vi.fn(),
      tryBuildTransport: vi.fn(),
    },
    sim: {
      tower: { placeTransportDryRun: vi.fn(() => true) },
      isUnlocked: vi.fn(() => true),
    },
    ui: { toast: vi.fn(), setInspectorPeek: vi.fn() },
    editor: { extendSelectedTo: vi.fn(), endExtend: vi.fn(() => true) },
    inspector: { inspect: vi.fn(), hide: vi.fn(), resetLatch: vi.fn() },
    saveLoad: { recoverFromContextLoss: vi.fn() },
    selectPicked: vi.fn(),
    clearSelection: vi.fn(),
    personCard: { open: vi.fn(() => true) },
    captureUndo: vi.fn(),
    commitUndo: vi.fn(),
    discardUndo: vi.fn(),
    undoGesture: vi.fn(() => 1),
    mobileMq: { matches: false },
    paintAnchor: null as unknown,
    buildAnchor: null as unknown,
    transportStart: null as unknown,
    frameErrors: [] as Array<{ at: string; message: string }>,
  };
  return app as unknown as GameApp & typeof app & { engine: FakeEngine };
}
