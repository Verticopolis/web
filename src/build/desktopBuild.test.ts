import { describe, it, expect } from "vitest";
import { isDesktopBuild } from "./desktopBuild";

describe("isDesktopBuild", () => {
  it("is true only for VC_DESKTOP=1 outside Vercel", () => {
    expect(isDesktopBuild({ VC_DESKTOP: "1" })).toBe(true);
  });

  it("is false when VC_DESKTOP is unset or empty", () => {
    expect(isDesktopBuild({})).toBe(false);
    expect(isDesktopBuild({ VC_DESKTOP: "" })).toBe(false);
    expect(isDesktopBuild({ VERCEL: "1", VERCEL_ENV: "production" })).toBe(false);
  });

  it("refuses a misspelled value instead of building the web game", () => {
    expect(() => isDesktopBuild({ VC_DESKTOP: "true" })).toThrow(/VC_DESKTOP must be "1" or unset; got "true"/);
    expect(() => isDesktopBuild({ VC_DESKTOP: "0" })).toThrow(/got "0"/);
  });

  it("refuses to make a desktop build on Vercel", () => {
    expect(() => isDesktopBuild({ VC_DESKTOP: "1", VERCEL: "1" })).toThrow(/Vercel build/);
  });
});
