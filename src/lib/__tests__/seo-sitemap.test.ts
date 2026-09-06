import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";

describe("Sitemap source dates and canonical archive discovery", () => {
  it("retains documented modification dates and omits invented build dates", () => {
    const dir = mkdtempSync(join(tmpdir(), "rr-sitemap-"));
    try {
      mkdirSync(join(dir, "public/content/about"), { recursive: true });
      mkdirSync(join(dir, "src/generated"), { recursive: true });
      const files = ["article", "service", "thank-you", "about/השמאי-רפאל-ריבוח-מייסד-ובעלים-2"];
      for (const name of files) writeFileSync(join(dir, `public/content/${name}.json`), "{}");
      writeFileSync(join(dir, "public/content/_indexes.json"), JSON.stringify({
        posts: [{ slug: "article", modified: "2026-08-01" }],
        categories: { 1: { slug: encodeURIComponent("מידע-מקצועי") }, 25: { slug: "water-damage-insurance" } },
      }));
      execFileSync(process.execPath, [resolve("scripts/generate-sitemap.mjs")], { cwd: dir });
      const xml = readFileSync(join(dir, "public/sitemap.xml"), "utf8");
      expect(xml.match(/<lastmod>/g)).toHaveLength(1);
      expect(xml).toContain("<lastmod>2026-08-01</lastmod>");
      expect(xml).toContain("/category/water-damage-insurance/");
      expect(xml).not.toContain("%25D7");
      expect(xml).not.toContain("/thank-you/");
      expect(xml).not.toContain(encodeURIComponent("השמאי-רפאל-ריבוח-מייסד-ובעלים-2"));
      expect(xml).toContain(encodeURIComponent("עורך-דין-קובי-ליבוביץ"));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
