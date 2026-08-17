function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Normalise migrated WordPress HTML before it reaches SSR or the browser.
 * Internal links should stay in the current browsing context, while genuine
 * content images need a useful fallback name. Loader/error placeholders remain
 * deliberately decorative so screen readers do not announce them.
 */
export function improveMigratedHtml(html: string, pageTitle: string): string {
  const fallbackAlt = escAttr(`תמונה מתוך ${pageTitle}`);
  return html
    .replace(/<a\b([^>]*\bhref=["'](?:\/|https?:\/\/(?:www\.)?rrshamaut\.co\.il)[^>]*?)>/gi, (tag) =>
      tag.replace(/\s+target=["']_blank["']/i, ""),
    )
    .replace(/<img\b([^>]*)>/gi, (tag, attrs: string) => {
      if (/\balt=["'][^"']+["']/i.test(attrs)) return tag;
      const decorative =
        /\bsuper-picture-img-(?:loading|error)\b/i.test(attrs) ||
        /\bsrc=["']data:image\/svg\+xml/i.test(attrs) ||
        !/\bsrc=["'][^"']+["']/i.test(attrs);
      if (decorative) {
        if (/\balt=["']["']/i.test(attrs)) return tag;
        return tag.replace(/^<img\b/i, '<img alt=""');
      }
      if (/\balt=["']["']/i.test(attrs)) {
        return tag.replace(/\balt=["']["']/i, `alt="${fallbackAlt}"`);
      }
      return tag.replace(/^<img\b/i, `<img alt="${fallbackAlt}"`);
    });
}
