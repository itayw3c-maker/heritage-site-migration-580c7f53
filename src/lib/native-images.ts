// Expose migrated WordPress image URLs during SSR; native loading="lazy"
// still controls below-the-fold downloads without waiting for hydration.
export function restoreMigratedImages(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const read = (name: string) =>
      new RegExp(`\\s${name}=(["'])([\\s\\S]*?)\\1`, "i").exec(tag);
    for (const [legacy, native] of [
      ["data-lazy-src", "src"],
      ["data-lazy-srcset", "srcset"],
      ["data-lazy-sizes", "sizes"],
    ]) {
      const source = read(legacy);
      if (!source || !source[2]) continue;
      const current = read(native);
      const replace = !current || !current[2] ||
        (native !== "sizes" && /^(?:data:|about:blank$)/i.test(current[2]));
      if (replace) {
        const attr = ` ${native}=${source[1]}${source[2]}${source[1]}`;
        tag = current ? tag.replace(current[0], attr) : tag.replace(/^<img\b/i, `<img${attr}`);
      }
      tag = tag.replace(source[0], "");
    }
    return tag;
  });
}
