# Code Review Report — 2026-03-07

Project: `lordblog` (AstroPaper-based)
Goal: keep the current style while making the project lighter (less JS/runtime weight, fewer packages, and potential CSS/native view-transition usage).

---

## 1) Executive Summary

The project is already clean and performant for an Astro blog, but there are **clear opportunities to reduce complexity and client-side JavaScript** without changing visual style.

### High-impact opportunities

1. **Remove likely unused dependency: `sharp`** (no source import found).
2. **Consolidate slugification logic** and potentially remove `lodash.kebabcase` + `slugify` (+ `@types/lodash.kebabcase`) with one small internal utility.
3. **Reduce transition-related JS complexity** by replacing Astro SPA swap flow (`ClientRouter` + `astro:after-swap` handlers) with native navigation where possible, and optionally CSS-native View Transitions.
4. **Convert a few UI behaviors from JS to semantic/CSS patterns** (mobile menu and back-to-top can be mostly no-JS).
5. **Refactor duplicated event wiring** to avoid re-attaching listeners after swaps.

---

## 2) Current Architecture Notes

### Runtime JS hotspots

- Global theme runtime script: `src/scripts/theme.ts`
- Router-enhanced page transitions: `src/layouts/Layout.astro` via `<ClientRouter />`
- Inline scripts in multiple components/pages:
  - `src/components/Header.astro`
  - `src/components/BackToTopButton.astro`
  - `src/components/BackButton.astro`
  - `src/layouts/Main.astro`
  - `src/pages/index.astro`
  - `src/layouts/PostDetails.astro`
  - `src/pages/search.astro`

### Build-time/tooling-heavy features

- Dynamic OG images: `satori` + `@resvg/resvg-js`
- Static search index generation: `pagefind` CLI + `@pagefind/default-ui`
- Tailwind + Typography plugin + Shiki transformers for markdown presentation

These are reasonable choices; most weight concerns are from **feature scope**, not accidental bloat.

---

## 3) Dependency Review (Keep / Optional / Remove)

## A) Likely removable now

### `sharp`
- Status: **Likely unused** (no imports found in source).
- Action: remove from `dependencies` and run full build check.
- Risk: low.

## B) Candidates to reduce package count

### `lodash.kebabcase` + `slugify` (+ `@types/lodash.kebabcase`)
- Used in `src/utils/slugify.ts`.
- Today this hybrid approach handles Latin and non-Latin differently.
- Action: replace with one internal slug function using Unicode normalization + regex handling.
- Benefit: fewer packages and simpler maintenance.
- Risk: medium (slug output differences can affect URL stability).

### `dayjs`
- Used in `src/components/Datetime.astro` for timezone formatting.
- Action: if timezone behavior can be simplified, replace with `Intl.DateTimeFormat`.
- Benefit: one less runtime dependency.
- Risk: medium (timezone output/parsing behavior must be validated).

## C) Optional only if feature can be simplified

### `@pagefind/default-ui`
- Used only on `src/pages/search.astro` and loaded dynamically.
- Option: keep `pagefind` indexing, replace only the default UI package with a custom lightweight UI.
- Benefit: smaller client payload and tighter styling control.
- Risk: medium-high (you must maintain custom search UI behavior).

### Dynamic OG stack (`satori`, `@resvg/resvg-js`)
- Used by `src/pages/og.png.ts`, `src/pages/posts/[...slug]/index.png.ts`, and `src/utils/generateOgImages.ts`.
- Option: disable dynamic OG generation and use static OG image.
- Benefit: less complexity and fewer heavy deps.
- Risk: medium (less rich social previews per post).

### `remark-collapse` / `remark-toc`
- Configured in `astro.config.ts`.
- Keep if TOC markdown conventions are important.
- Remove only if you want to simplify markdown processing.

---

## 4) JS → CSS / Native Alternatives

You asked specifically about replacing JS with CSS view transitions where possible.

## A) Route transitions

Current: Astro client router (`<ClientRouter />`) plus multiple `astro:after-swap` listeners.

Option 1 (lighter):
- Remove `<ClientRouter />` for full-page navigation.
- Use pure CSS transitions for in-page interactions only.

Option 2 (modern/native):
- Keep full-page browser navigation.
- Add native CSS View Transitions where supported using `@view-transition { navigation: auto; }`.
- Keep a graceful fallback for unsupported browsers.

This can reduce client-side routing JS and simplify event lifecycle management.

## B) Mobile menu (`Header.astro`)

Current: JS toggles visibility and icon states.

CSS/semantic alternative:
- Replace with `<details>/<summary>` pattern.
- Use CSS to style open/closed states and icons.
- Result: no JS listener required for menu toggle.

## C) Back-to-top (`BackToTopButton.astro`)

Current: JS for click behavior + scroll progress + visibility.

Alternative:
- Use anchor link (`href="#top"`) and CSS smooth scrolling.
- Keep progress indicator only if needed (progress requires JS or scroll-driven animation support).

## D) Post details enhancements (`PostDetails.astro`)

- Heading permalink injection and copy-code button creation require JS (reasonable to keep).
- Improvement: move to idempotent init guards to prevent duplicate DOM injection on repeated transition lifecycle events.

---

## 5) Important Code Quality Findings

1. **Potential duplicated listeners after transitions**
   - `Header.astro` calls `toggleNav()` initially and on `astro:after-swap`, with `addEventListener` inside.
   - Risk: repeated listeners after many navigations.
   - Fix: guard with dataset flag, or remove/rebind safely.

2. **Theme script split is good, but can be simplified if routing model changes**
   - Minimal FOUC script + full script is a solid pattern.
   - If you move away from client swap routing, several `astro:before-swap/after-swap` hooks can be removed.

3. **`tsconfig.json` still has JSX React settings**
   - `"jsx": "react-jsx"` and `"jsxImportSource": "react"` appear legacy from earlier React usage.
   - Not a runtime issue, but can be simplified if no TSX/React tooling relies on it.

4. **Build script uses shell command `cp -r`**
   - In `package.json`, this may be non-portable on pure Windows shells.
   - Consider replacing with cross-platform utility (`cpy-cli`, `shx`, or Astro/Vite hook).

---

## 6) Prioritized Action Plan

## Phase 1 — quick wins (low risk)

1. Remove `sharp`.
2. Fix duplicate listener patterns (especially `Header.astro`).
3. Clean tsconfig legacy JSX settings if safe.
4. Make build copy step cross-platform.

Expected result: smaller dependency graph, cleaner runtime behavior, no style change.

## Phase 2 — moderate changes

1. Replace slug deps with one internal utility.
2. Optionally replace `dayjs` with `Intl.DateTimeFormat`.

Expected result: fewer packages and less maintenance overhead.

## Phase 3 — transition/runtime simplification

1. Decide whether to keep Astro client router.
2. If removing it, drop swap-related event complexity.
3. Introduce CSS/native View Transition enhancement (`@view-transition`) with fallback.

Expected result: leaner client runtime and simpler lifecycle code.

---

## 7) Estimated Impact

- **Dependency count reduction**: 1 to 4 packages realistically removable without visual changes.
- **Client JS reduction**: moderate, especially if SPA swap lifecycle hooks are reduced.
- **Complexity reduction**: high in navigation/event lifecycle logic.
- **Visual/style impact**: minimal if migration is staged and CSS tokens remain unchanged.

---

## 8) Suggested First Implementation Ticket

Title: *Lean runtime baseline without design changes*

Scope:
1. Remove `sharp` and validate build.
2. Fix duplicated event listener registration in `Header.astro` and any swap-hook scripts.
3. Make build copy command cross-platform.
4. Add a short architecture note in README describing current JS-required behaviors vs optional enhancements.

This gives immediate cleanup with low risk and sets up the larger JS-to-CSS transition work.

---

## 9) Final Recommendation

If your priority is “same look, lighter project,” the best path is:

1) **Dependency cleanup first** (`sharp`, then slug/date libs if acceptable),
2) **Event lifecycle simplification second**,
3) **Routing transition model decision last** (ClientRouter vs native navigation + CSS View Transitions).

That sequence avoids regressions while still moving toward a leaner, less JS-heavy architecture.
