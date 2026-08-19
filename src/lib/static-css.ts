// Maps a `static` content slug to the CSS file that scripts/extract-static-css.mjs
// emitted for it at prebuild time. Keeping the key derivation in one place means
// the build script and the runtime cannot drift apart.
import manifest from "../../public/content-css/manifest.json";

const MANIFEST = manifest as Record<string, string>;

/** Slug -> filesystem-safe key. Mirrors cssKey() in scripts/extract-static-css.mjs. */
export function cssKeyForSlug(slug: string): string {
  return slug.replace(/\//g, "__");
}

/**
 * The href of the extracted stylesheet for this slug, or null when the page has
 * no extracted CSS (any non-static record, or a static one added since the last
 * prebuild — those still fall back to the inline styles_css path).
 */
export function staticCssHref(slug: string): string | null {
  return MANIFEST[slug.replace(/^\/+|\/+$/g, "")] ?? null;
}
