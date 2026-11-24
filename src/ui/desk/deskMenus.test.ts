import { describe, expect, it } from "vitest";
import { deskOptionStates } from "./deskMenus";

describe("deskOptionStates", () => {
  it("on the desk, Options opens the Control Panel for Screen Saver and Appearance and drops the empty display line", () => {
    expect(deskOptionStates(true)).toEqual({
      "mb-screensaver": { hidden: true },
      "mb-appearance": { hidden: true },
      "mb-display-sep": { hidden: true },
      "mb-control-sep": { hidden: false },
      "mb-control-panel": { hidden: false },
    });
  });

  it("with no desk, and so no Control Panel, Options has them all back", () => {
    expect(deskOptionStates(false)).toEqual({
      "mb-screensaver": { hidden: false },
      "mb-appearance": { hidden: false },
      "mb-display-sep": { hidden: false },
      "mb-control-sep": { hidden: true },
      "mb-control-panel": { hidden: true },
    });
  });
});
