import { describe, it, expect, vi } from "vitest";
import { adoptShellMute, shellMuted } from "./shellMute";

const at = (search: string, hash = "") => ({
  loc: { search, pathname: "/index.html", hash },
  history: { replaceState: vi.fn() },
});

describe("shellMuted", () => {
  it("reads 1 as muted and 0 as not", () => {
    expect(shellMuted("?muted=1")).toBe(true);
    expect(shellMuted("?muted=0")).toBe(false);
  });

  it("is null without the parameter or with any other value", () => {
    expect(shellMuted("")).toBeNull();
    expect(shellMuted("?muted=yes")).toBeNull();
    expect(shellMuted("?debug=fps")).toBeNull();
  });
});

describe("adoptShellMute", () => {
  it("takes the shell's mute over the saved one and saves it", () => {
    const save = vi.fn();
    const address = at("?muted=1");
    expect(adoptShellMute({ muted: false, musicVolume: 0.5 }, address, save)).toEqual({
      muted: true,
      musicVolume: 0.5,
    });
    expect(save).toHaveBeenCalledWith({ muted: true, musicVolume: 0.5 });
  });

  it("unmutes when the shell passes 0", () => {
    const save = vi.fn();
    expect(adoptShellMute({ muted: true }, at("?muted=0"), save)).toEqual({ muted: false });
  });

  it("drops only its own parameter from the address", () => {
    const address = at("?debug=fps&muted=1", "#top");
    adoptShellMute({}, address, vi.fn());
    expect(address.history.replaceState).toHaveBeenCalledWith(null, "", "/index.html?debug=fps#top");
  });

  it("leaves the prefs, the save and the address alone without the parameter", () => {
    const save = vi.fn();
    const address = at("?debug=fps");
    const prefs = { muted: true };
    expect(adoptShellMute(prefs, address, save)).toBe(prefs);
    expect(save).not.toHaveBeenCalled();
    expect(address.history.replaceState).not.toHaveBeenCalled();
  });

  it("still adopts the mute when the address cannot be rewritten", () => {
    const address = at("?muted=1");
    address.history.replaceState.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(adoptShellMute({}, address, vi.fn())).toEqual({ muted: true });
  });
});
