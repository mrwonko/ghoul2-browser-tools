export default function (eleventyConfig) {
  // Copies site/css unprocessed into the output dir's css/ — the Eleventy
  // equivalent of the plain stylesheet the page used to reference directly.
  eleventyConfig.addPassthroughCopy({ "site/css": "css" });

  // Rewrites a root-relative target into one relative to the given page's
  // own directory depth, so the same asset/nav link works regardless of how
  // deeply nested the page is (e.g. `/` vs `/jk3-to-jk2/`) without a
  // root-absolute path, which would break under a subpath deploy (see
  // decisions/multi-page-relative-links.md).
  eleventyConfig.addFilter("fromRoot", (target, pageUrl) => {
    const depth = pageUrl.split("/").filter(Boolean).length;
    return depth === 0 ? target : "../".repeat(depth) + target;
  });

  return {
    dir: {
      input: "site",
      includes: "_includes",
      // Relative to the project root (not to `dir.input`), so this lands in
      // the same dist/ that tsc's `outDir` writes into.
      output: "dist",
    },
  };
}
