import type { GameApp } from "../main";
import { HANDED_TOWER_NAME, HANDED_TOWER_PATH, takeHandedTower, wireHandedTower } from "./handedTower";

const m = vi.hoisted(() => ({
  track: vi.fn(),
  readPickedFile: vi.fn(),
  stopped: false,
  desktop: true,
}));

vi.mock("../analytics", () => ({ trackAppAction: m.track }));
vi.mock("../ui/uiImport", () => ({ readPickedFile: m.readPickedFile }));
vi.mock("./interactionState", () => ({ isEngineStopped: () => m.stopped }));
vi.mock("../deployTarget", () => ({
  get DESKTOP_BUILD() {
    return m.desktop;
  },
}));

const BYTES = new Uint8Array([86, 67, 84, 79, 87, 69, 82, 50, 10, 1, 2, 3]);
const app = { ui: { ui: "ui" } } as unknown as GameApp;

/** A fetch stand-in that answers with `status`, the bytes and a name header. */
const answering = (status: number, name: string | null = "Harbor%20Point.vctower", body: Uint8Array = BYTES) =>
  vi.fn(async (_input: string, _init?: RequestInit) => {
    const headers = new Headers();
    if (name !== null) headers.set(HANDED_TOWER_NAME, name);
    return new Response(status === 200 ? new Uint8Array(body) : null, { status, headers });
  });

/** Let the fetch and the file read settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  m.track.mockClear();
  m.readPickedFile.mockClear();
  m.stopped = false;
  m.desktop = true;
});

describe("takeHandedTower", () => {
  it("asks the app's path, uncached, and reads the file under the name it sends", async () => {
    const fetcher = answering(200);
    const file = await takeHandedTower(fetcher);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(HANDED_TOWER_PATH, { cache: "no-store" });
    expect(file?.name).toBe("Harbor Point.vctower");
    expect(new Uint8Array(await file!.arrayBuffer())).toEqual(BYTES);
  });

  it("names a file the app sent no name or a broken one for Tower.vctower", async () => {
    expect((await takeHandedTower(answering(200, null)))?.name).toBe("Tower.vctower");
    expect((await takeHandedTower(answering(200, "%E0%A4%A")))?.name).toBe("Tower.vctower");
  });

  it("has nothing when the app has no file, sends an empty one, or cannot be reached", async () => {
    expect(await takeHandedTower(answering(204))).toBeNull();
    expect(await takeHandedTower(answering(404))).toBeNull();
    expect(await takeHandedTower(answering(200, "A.vctower", new Uint8Array()))).toBeNull();
    expect(await takeHandedTower(vi.fn(async () => Promise.reject(new TypeError("offline"))))).toBeNull();
  });
});

describe("wireHandedTower", () => {
  it("opens a handed tower in the desktop build as a picked file", async () => {
    wireHandedTower(app, answering(200));
    await settle();
    expect(m.track).toHaveBeenCalledExactlyOnceWith("file_handed");
    expect(m.readPickedFile).toHaveBeenCalledOnce();
    const [ui, file] = m.readPickedFile.mock.calls[0] as [unknown, File];
    expect(ui).toBe(app.ui);
    expect(file.name).toBe("Harbor Point.vctower");
  });

  it("asks nothing outside the desktop build, and opens nothing once the engine has stopped", async () => {
    m.desktop = false;
    const web = answering(200);
    wireHandedTower(app, web);
    expect(web).not.toHaveBeenCalled();
    m.desktop = true;
    m.stopped = true;
    wireHandedTower(app, answering(200));
    await settle();
    expect(m.readPickedFile).not.toHaveBeenCalled();
    expect(m.track).not.toHaveBeenCalled();
  });

  it("opens nothing when the app has no tower to hand", async () => {
    wireHandedTower(app, answering(204));
    await settle();
    expect(m.readPickedFile).not.toHaveBeenCalled();
  });
});
