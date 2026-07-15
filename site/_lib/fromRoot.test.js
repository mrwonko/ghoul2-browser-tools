import { describe, expect, it } from "vitest";
import { fromRoot } from "./fromRoot.js";

// Eleventy's page.url always has both a leading and trailing slash (e.g.
// "/" for the root page, "/jk3-to-jk2/" one level deep). A naive
// pageUrl.split("/") therefore always yields two extra empty strings (one
// from the leading slash, one from the trailing slash) — "/".split("/") is
// ["", ""] (length 2, not depth 0), and "/jk3-to-jk2/".split("/") is
// ["", "jk3-to-jk2", ""] (length 3, not depth 1). filter(Boolean) strips
// those empty segments so .length reflects the actual directory depth;
// the root-page and one-level-deep cases below fail without it.
describe("fromRoot", () => {
  it("computes depth 0 for the root page, despite '/' splitting into two empty segments", () => {
    expect(fromRoot("css/main.css", "/")).toBe("css/main.css");
  });

  it("computes depth 1 for a page one directory deep, despite the leading/trailing slash adding two empty segments around it", () => {
    expect(fromRoot("css/main.css", "/jk3-to-jk2/")).toBe(
      "../css/main.css",
    );
  });

  it("computes depth 2 for a page two directories deep", () => {
    expect(fromRoot("css/main.css", "/a/b/")).toBe("../../css/main.css");
  });

  it("still works without a leading or trailing slash", () => {
    expect(fromRoot("css/main.css", "jk3-to-jk2")).toBe("../css/main.css");
  });
});
