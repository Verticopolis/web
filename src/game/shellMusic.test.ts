import { describe, expect, it, vi } from "vitest";
import { shellBeat, startShellSound } from "./shellMusic";

const at = (search: string, hash = "") => ({
  loc: { search, pathname: "/index.html", hash },
  history: { replaceState: vi.fn() },
});

const audio = () => ({ continueMusic: vi.fn(), start: vi.fn() });

describe("shellBeat", () => {
  it("reads the seconds into the theme and when they were read", () => {
    expect(shellBeat("?music=12.345&musicAt=1700000000000")).toEqual({ seconds: 12.345, asOf: 1_700_000_000_000 });
  });

  it("is null unless both are finite numbers that are not negative", () => {
    expect(shellBeat("")).toBeNull();
    expect(shellBeat("?music=12")).toBeNull();
    expect(shellBeat("?musicAt=1700000000000")).toBeNull();
    expect(shellBeat("?music=&musicAt=1700000000000")).toBeNull();
    expect(shellBeat("?music=abc&musicAt=1700000000000")).toBeNull();
    expect(shellBeat("?music=Infinity&musicAt=1700000000000")).toBeNull();
    expect(shellBeat("?music=-2&musicAt=1700000000000")).toBeNull();
  });
});

describe("startShellSound", () => {
  it("starts the theme from the shell's beat and drops the beat from the address", () => {
    const a = audio();
    const address = at("?debug=fps&music=3.5&musicAt=1000", "#top");
    startShellSound(a, address);
    expect(a.continueMusic).toHaveBeenCalledWith(3.5, 1000);
    expect(a.start).toHaveBeenCalledOnce();
    expect(a.continueMusic.mock.invocationCallOrder[0]).toBeLessThan(a.start.mock.invocationCallOrder[0]);
    expect(address.history.replaceState).toHaveBeenCalledWith(null, "", "/index.html?debug=fps#top");
  });

  it("starts from the top without a beat, and leaves the address alone", () => {
    const a = audio();
    const address = at("?debug=fps");
    startShellSound(a, address);
    expect(a.continueMusic).not.toHaveBeenCalled();
    expect(a.start).toHaveBeenCalledOnce();
    expect(address.history.replaceState).not.toHaveBeenCalled();
  });

  it("still tidies a beat it cannot read", () => {
    const a = audio();
    const address = at("?music=soon");
    startShellSound(a, address);
    expect(a.continueMusic).not.toHaveBeenCalled();
    expect(address.history.replaceState).toHaveBeenCalledWith(null, "", "/index.html");
  });

  it("starts the sound even where the address cannot be rewritten", () => {
    const a = audio();
    const address = at("?music=1&musicAt=2");
    address.history.replaceState.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => startShellSound(a, address)).not.toThrow();
    expect(a.start).toHaveBeenCalledOnce();
  });
});
