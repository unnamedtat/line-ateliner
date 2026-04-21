import { describe, expect, it } from "vitest";

import { CLASSIC_SCRIPT_PATHS } from "../../src/boot/legacy-manifest";

describe("CLASSIC_SCRIPT_PATHS", () => {
  it("keeps scene drawing in the classic startup path", () => {
    expect(CLASSIC_SCRIPT_PATHS).toContain("/legacy/scene/draw.js");
  });

  it("keeps export helpers out of the classic startup path", () => {
    expect(CLASSIC_SCRIPT_PATHS).not.toContain("/legacy/export/state.js");
    expect(CLASSIC_SCRIPT_PATHS).not.toContain("/legacy/export/assets.js");
    expect(CLASSIC_SCRIPT_PATHS).not.toContain("/legacy/export/render.js");
    expect(CLASSIC_SCRIPT_PATHS).not.toContain("/legacy/export/actions.js");
  });
});
