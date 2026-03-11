/**
 * Post-build script: copies all files from dist/ into dist/blog/
 * so that Cloudflare Pages (or any static host) serves the site
 * correctly under the /blog base path.
 */
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const base = "blog";
const target = join(dist, base);

mkdirSync(target, { recursive: true });

for (const entry of readdirSync(dist)) {
  if (entry === base) continue; // don't copy into itself
  cpSync(join(dist, entry), join(target, entry), { recursive: true });
}

console.log(`✓ Copied dist/ contents into dist/${base}/`);
