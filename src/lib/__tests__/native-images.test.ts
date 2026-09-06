import { describe, it, expect } from "vitest";
import { improveMigratedHtml } from "../migrated-html";
describe("migrated images in server HTML", () => {
  it("renders real responsive URLs without hydration and preserves lazy loading and dimensions", () => {
    const html = improveMigratedHtml('<img width="500" height="400" src="data:image/svg+xml,placeholder" data-lazy-src="/water.webp" data-lazy-srcset="/water.webp 500w, /small.webp 300w" data-lazy-sizes="100vw" loading="lazy">', "נזקי מים");
    expect(html).toContain(' src="/water.webp"');
    expect(html).toContain(' srcset="/water.webp 500w, /small.webp 300w"');
    expect(html).toContain(' sizes="100vw"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('width="500" height="400"');
    expect(html).not.toContain("data-lazy-");
    expect(improveMigratedHtml(html, "נזקי מים")).toBe(html);
  });
  it("preserves existing real sources and explicit eager priority", () => {
    const html = improveMigratedHtml('<img src="/hero.webp" data-lazy-src="/old.webp" srcset="/hero.webp 500w" data-lazy-srcset="/old.webp 500w" loading="eager" fetchpriority="high">', "Hero");
    expect(html).toContain('src="/hero.webp"');
    expect(html).toContain('srcset="/hero.webp 500w"');
    expect(html).toContain('loading="eager" fetchpriority="high"');
    expect(html).not.toContain("/old.webp");
  });
  it("supports single quotes and leaves iframes and unrelated data attributes unchanged", () => {
    const html = improveMigratedHtml("<img data-src='/other' data-lazy-src='/water.webp'><iframe data-lazy-src='/video'></iframe>", "Water");
    expect(html).toContain(" src='/water.webp'");
    expect(html).toContain("data-src='/other'");
    expect(html).toContain("<iframe data-lazy-src='/video'></iframe>");
  });
});
