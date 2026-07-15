import { fromRoot } from "./site/_lib/fromRoot.js";

export default function (eleventyConfig) {
  // Copies site/css unprocessed into the output dir's css/ — the Eleventy
  // equivalent of the plain stylesheet the page used to reference directly.
  eleventyConfig.addPassthroughCopy({ "site/css": "css" });

  // See site/_lib/fromRoot.js and decisions/multi-page-relative-links.md.
  eleventyConfig.addFilter("fromRoot", fromRoot);

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
