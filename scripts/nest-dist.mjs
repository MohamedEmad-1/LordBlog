/**
 * Post-build script:
 * 1. Copies dist/pagefind → public/pagefind (for dev mode search)
 * 2. Copies all dist/ contents into dist/blog/ so Cloudflare Pages
 *    serves the site correctly under the /blog base path.
 */
import { cpSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// 1. Copy pagefind to public for dev
const pagefindSrc = join("dist", "pagefind");
const pagefindDest = join("public", "pagefind");
if (existsSync(pagefindSrc)) {
  mkdirSync(pagefindDest, { recursive: true });
  cpSync(pagefindSrc, pagefindDest, { recursive: true });
  console.log("✓ Copied dist/pagefind → public/pagefind");
}

// 2. Nest everything into dist/blog/
const dist = "dist";
const base = "blog";
const target = join(dist, base);

mkdirSync(target, { recursive: true });

for (const entry of readdirSync(dist)) {
  if (entry === base) continue;
  cpSync(join(dist, entry), join(target, entry), { recursive: true });
}

console.log(`✓ Copied dist/ contents into dist/${base}/`);
