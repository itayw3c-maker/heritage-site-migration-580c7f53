import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { selectArchivePage, archiveSeo, type IndexBundle } from "../archive";
import { improveMigratedHtml } from "../migrated-html";
import { buildSeoHead } from "../seo-head";
import { ArchivePage } from "../../components/ArchivePage";

vi.mock("@/lib/elementor-enhance", () => ({ enhanceElementor: vi.fn() }));
const index = JSON.parse(readFileSync("public/content/_indexes.json", "utf8")) as IndexBundle;
const categorySlug = "מידע-מקצועי";

describe("Archive server rendering and discoverability", () => {
  it("includes articles, headings and real next-page links without effects or browser fetch", () => {
    const archive = selectArchivePage(index, { kind: "category", page: 1, categorySlug })!;
    const html = renderToStaticMarkup(createElement(ArchivePage, { archive }));
    expect(archive.posts).toHaveLength(9);
    for (const post of archive.posts) expect(html).toContain(`href="/${post.slug}/"`);
    expect(html).toContain("/page/2/");
    expect(html).toContain(archive.heading);
    expect(html).not.toContain("__HOLE_");
    expect(html).not.toContain('aria-busy="true"');
  });
  it.each(["shorts", "success"] as const)("server renders the %s archive too", kind => {
    const archive = selectArchivePage(index, { kind, page: 1 })!;
    const html = renderToStaticMarkup(createElement(ArchivePage, { archive }));
    expect(html).toContain(`href="/${archive.posts[0].slug}/"`);
    expect(html).not.toContain("__HOLE_");
  });
  it("gives page two a distinct canonical, title and matching structured data", () => {
    const archive = selectArchivePage(index, { kind: "category", page: 2, categorySlug })!;
    const seo = archiveSeo(null, archive);
    const head = buildSeoHead(seo);
    expect(seo.canonical).toMatch(/\/page\/2\/$/);
    expect(head.meta).toContainEqual({ title: archive.title });
    expect(archive.title).toContain("עמוד 2");
    expect(JSON.parse(seo.schema!).mainEntity.itemListElement).toHaveLength(9);
    expect(head.links).toContainEqual({ rel: "canonical", href: archive.canonical });
  });
  it("rejects unknown categories and invalid/out-of-range pages instead of duplicating page one", () => {
    for (const page of [0, -1, 1.5, NaN, Infinity, 999999]) {
      expect(selectArchivePage(index, { kind: "category", page, categorySlug })).toBeNull();
    }
    expect(selectArchivePage(index, { kind: "category", page: 1, categorySlug: "missing" })).toBeNull();
  });
  it("uses the same encoded category and avoids duplicated imported/DB posts", () => {
    const post = { ...index.posts[0], title: "Updated", date: "2099-01-01", categories: [25] };
    const archive = selectArchivePage(index, { kind: "category", page: 1, categorySlug: encodeURIComponent(categorySlug) }, [post])!;
    expect(archive.posts.filter(p => p.slug === post.slug)).toHaveLength(1);
    expect(archive.posts[0].title).toBe("Updated");
  });
  it("escapes titles in HTML and JSON-LD", () => {
    const post = { ...index.posts[0], title: '</script><img src=x onerror="alert(1)">', date: "2099-01-01" };
    const archive = selectArchivePage(index, { kind: "category", page: 1, categorySlug }, [post])!;
    const html = renderToStaticMarkup(createElement(ArchivePage, { archive }));
    expect(html).not.toContain('<img src=x');
    expect(archiveSeo(null, archive).schema).not.toContain('</script>');
  });
});

describe("Migrated navigation destinations", () => {
  it("repairs the real header and footer before server rendering", () => {
    for (const path of ["src/generated/header.html", "src/generated/footer.html"]) {
      const html = improveMigratedHtml(readFileSync(path, "utf8"), "RR");
      for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        if (/קובי ליבוביץ/.test(match[2])) expect(match[1]).toBe("/about/עורך-דין-קובי-ליבוביץ/");
        if (/נזקי טבע שיטפונות וסערה/.test(match[2])) expect(match[1]).toBe("/נזקי-טבע-שיטפונות-וסערה/");
      }
    }
  });
  it("preserves Rafael, fire service and external destinations", () => {
    const input = '<a href="/about/השמאי-רפאל-ריבוח-מייסד-ובעלים-2/">רפאל ריבוח</a><a href="/נזקי-אש-ופיח/">נזקי אש ופיח</a><a href="https://example.com/">קובי ליבוביץ</a>';
    const html = improveMigratedHtml(input, "RR");
    expect(html).toContain('href="/about/השמאי-רפאל-ריבוח-מייסד-ובעלים/"');
    expect(html).toContain('href="/נזקי-אש-ופיח/"');
    expect(html).toContain('href="https://example.com/"');
    expect(improveMigratedHtml(html, "RR")).toBe(html);
  });
});
