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
const testCases: {
  name: string;
  target: string;
  pageUrl: string;
  want: string;
}[] = [
  {
    name: "computes depth 0 for the root page, despite '/' splitting into two empty segments",
    target: "css/main.css",
    pageUrl: "/",
    want: "css/main.css",
  },
  {
    name: "computes depth 1 for a page one directory deep, despite the leading/trailing slash adding two empty segments around it",
    target: "css/main.css",
    pageUrl: "/jk3-to-jk2/",
    want: "../css/main.css",
  },
  {
    name: "computes depth 2 for a page two directories deep",
    target: "css/main.css",
    pageUrl: "/a/b/",
    want: "../../css/main.css",
  },
  {
    name: "still works without a leading or trailing slash",
    target: "css/main.css",
    pageUrl: "jk3-to-jk2",
    want: "../css/main.css",
  },
];

describe("fromRoot", () => {
  it.each(testCases)("$name", ({ target, pageUrl, want }) => {
    expect(fromRoot(target, pageUrl)).toBe(want);
  });
});
