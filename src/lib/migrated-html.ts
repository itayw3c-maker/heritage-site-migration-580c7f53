function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function linkPurpose(href: string): string {
  try {
    const pathname = new URL(href, "https://www.rrshamaut.co.il").pathname;
    const slug = decodeURIComponent(pathname).split("/").filter(Boolean).pop() ?? "העמוד";
    return slug.replace(/[-_]+/g, " ").trim() || "העמוד";
  } catch {
    return "העמוד המקושר";
  }
}

/**
 * Normalise migrated WordPress HTML before it reaches SSR or the browser.
 * Internal links should stay in the current browsing context, while genuine
 * content images need a useful fallback name. Loader/error placeholders remain
 * deliberately decorative so screen readers do not announce them.
 */
export function improveMigratedHtml(html: string, pageTitle: string): string {
  const fallbackAlt = escAttr(pageTitle);
  return html
    .replace(/(<div\b[^>]*?)\s+role=["']list["']([^>]*>)/gi, "$1$2")
    .replace(/(<article\b[^>]*?)\s+role=["']listitem["']([^>]*>)/gi, "$1$2")
    .replace(/<a\b([^>]*\bhref=["'](?:\/|https?:\/\/(?:www\.)?rrshamaut\.co\.il)[^>]*?)>/gi, (tag) =>
      tag.replace(/\s+target=["']_blank["']/i, ""),
    )
    .replace(/<a\b([^>]*\bhref=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi, (tag, attrs: string, href: string, body: string) => {
      const text = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim();
      if (text !== "עוד" || /\baria-label\s*=/i.test(attrs)) return tag;
      return tag.replace(/^<a\b/i, `<a aria-label="${escAttr(`קראו עוד על ${linkPurpose(href)}`)}"`);
    })
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
