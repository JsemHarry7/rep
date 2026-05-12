/**
 * Render public/og.svg → public/og.png at 1200×630 for og:image use.
 *
 * Runs locally (not in CF build) — commit the PNG. Fonts use generic
 * system fallbacks (Georgia, Menlo) so resvg's default font resolution
 * picks something sensible on most platforms.
 *
 * Usage: npm run gen:og
 */

import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync("./public/og.svg", "utf-8");
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: "Georgia",
  },
});
const png = resvg.render().asPng();
writeFileSync("./public/og.png", png);

console.log(`generated public/og.png (${(png.length / 1024).toFixed(1)} KB)`);
