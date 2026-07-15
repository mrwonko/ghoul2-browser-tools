import { describe, expect, it } from "vitest";
import { fromRoot } from "./fromRoot.js";

describe("fromRoot", () => {
  it("leaves the target untouched at the root page", () => {
    expect(fromRoot("css/main.css", "/")).toBe("css/main.css");
  });

  it("prefixes one level up for a page one directory deep", () => {
    expect(fromRoot("css/main.css", "/jk3-to-jk2/")).toBe(
      "../css/main.css",
    );
  });

  it("prefixes one level up per directory regardless of leading/trailing slashes", () => {
    expect(fromRoot("css/main.css", "jk3-to-jk2")).toBe("../css/main.css");
  });

  it("stacks a prefix per level for deeper pages", () => {
    expect(fromRoot("css/main.css", "/a/b/")).toBe("../../css/main.css");
  });
});
