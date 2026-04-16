import { describe, expect, it } from "vitest";

import { CLASSIC_SCRIPT_PATHS } from "../../src/boot/legacy-manifest";

describe("CLASSIC_SCRIPT_PATHS", () => {
  it("loads p5 before legacy app scripts", () => {
    expect(CLASSIC_SCRIPT_PATHS[0]).toBe("/vendor/p5.min.js");
  });

  it("keeps sketch loading before export helpers", () => {
    expect(CLASSIC_SCRIPT_PATHS.indexOf("/legacy/scene/draw.js")).toBeLessThan(
      CLASSIC_SCRIPT_PATHS.indexOf("/legacy/export/actions.js")
    );
  });
});
