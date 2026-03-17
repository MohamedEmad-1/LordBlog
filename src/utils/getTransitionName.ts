/**
 * Produce a deterministic, CSS-ident-safe view-transition-name from a post title.
 *
 * Rules applied (in order):
 *  1. Lowercase
 *  2. Replace dots, underscores, spaces and consecutive non-alphanumeric runs with a single hyphen
 *  3. Strip leading/trailing hyphens
 *  4. Prefix with "post-" so the result is always a valid CSS custom-ident
 *     (custom-idents must not start with a digit)
 */
export function getTransitionName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0080-\uffff]+/g, "-") // collapse non-alnum runs to hyphen (keep non-Latin chars)
    .replace(/^-+|-+$/g, "");                   // trim leading/trailing hyphens

  return `post-${slug}`;
}
