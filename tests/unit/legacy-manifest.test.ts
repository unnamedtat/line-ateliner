import { describe, expect, it } from "vitest";

import { CLASSIC_SCRIPT_PATHS } from "../../src/boot/legacy-manifest";

describe("CLASSIC_SCRIPT_PATHS", () => {
  it("loads vendor dependencies before legacy app scripts", () => {
    expect(CLASSIC_SCRIPT_PATHS.slice(0, 2)).toEqual(["/vendor/p5.min.js", "/vendor/gif.js"]);
  });

  it("keeps sketch loading before export helpers", () => {
    expect(CLASSIC_SCRIPT_PATHS.indexOf("/legacy/sketch.js")).toBeLessThan(
      CLASSIC_SCRIPT_PATHS.indexOf("/legacy/app-export.js")
    );
  });
});
