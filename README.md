# LordBlog

LordBlog is a customized Astro blog focused on software and hardware analysis, practical coding write-ups, and editorial-style technical posts.

## What This Repository Is

- Framework: Astro 5
- Styling: TailwindCSS 4
- Content: Markdown collection at src/data/blog
- Search: Pagefind index generated at build time
- OG images: Dynamic generation via Satori + Resvg
- Base path: /blog

## Current Content Workflow

- Published blog posts live in src/data/blog
- Files or folders starting with _ are excluded from content collection
- Reusable AI prompts/templates are stored in templates (outside content)

## Project Structure

```text
/
|- public/
|- src/
|  |- assets/
|  |- components/
|  |- data/blog/
|  |- layouts/
|  |- pages/
|  |- scripts/
|  |- styles/
|  |- utils/
|  |- config.ts
|  |- content.config.ts
|- templates/
|- astro.config.ts
|- package.json
```

## Local Development

```bash
pnpm install
pnpm dev
```

## Build and Preview

```bash
pnpm build
pnpm preview
```

## Environment Variables

Create a .env file in the project root and set what you need:

```bash
# Optional: Google Search Console verification
PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-token

# Optional: Google Analytics 4 measurement ID
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Notes:
- Google Analytics is only loaded when PUBLIC_GA_MEASUREMENT_ID is set.
- If PUBLIC_GA_MEASUREMENT_ID is empty or missing, no GA script is injected.

## Google Analytics (GA4)

GA4 integration is implemented globally in the site layout.

What it does:
- Loads gtag.js from googletagmanager
- Initializes GA with your measurement ID
- Enables anonymize_ip

Where it is configured:
- Env schema: astro.config.ts
- Injection point: src/layouts/Layout.astro

## Content Authoring

Use the templates in templates/ for faster writing with AI:

- templates/general-purpose-template.md
- templates/software-review-template.md
- templates/software-comparison-template.md
- templates/hardware-news-template.md
- templates/hardware-comparison-template.md
- templates/code-template.md
- templates/libraries-template.md

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm format
pnpm format:check
pnpm sync
```

## Deployment Notes

- Site URL and defaults are controlled in src/config.ts
- Astro base path is configured in astro.config.ts
- Build output is written to dist/blog

## License

MIT (inherits from the upstream AstroPaper base unless changed explicitly).
