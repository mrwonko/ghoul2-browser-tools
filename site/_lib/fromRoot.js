// Rewrites a root-relative target into one relative to the given page's own
// directory depth, so the same asset/nav link works regardless of how deeply
// nested the page is (e.g. `/` vs `/jk3-to-jk2/`) without a root-absolute
// path, which would break under a subpath deploy (see
// decisions/multi-page-relative-links.md).
export function fromRoot(target, pageUrl) {
  const depth = pageUrl.split("/").filter(Boolean).length;
  return depth === 0 ? target : "../".repeat(depth) + target;
}
