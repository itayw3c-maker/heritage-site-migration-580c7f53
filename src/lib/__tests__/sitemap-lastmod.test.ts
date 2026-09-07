import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error - plain ESM build script module without types
import { buildModMap } from "../../../scripts/sitemap-lastmod.mjs";

describe("sitemap lastmod mapping", () => {
  it("keys shorts and success entries by their nested content path", () => {
    const map = buildModMap({
      posts: [{ slug: "מאמר", modified: "2026-01-02" }],
      shorts: [{ slug: "קצר", modified: "2026-02-03" }],
      success: [{ slug: "הצלחה", date: "2026-03-04" }],
    }) as Map<string, string>;

    expect(map.get("מאמר")).toBe("2026-01-02");
    expect(map.get("shorts/קצר")).toBe("2026-02-03");
    expect(map.get("success/הצלחה")).toBe("2026-03-04");
    expect(map.has("קצר")).toBe(false);
  });

  it("does not double the prefix when the index slug already carries it", () => {
    const map = buildModMap({ shorts: [{ slug: "shorts/קצר", modified: "2026-02-03" }] }) as Map<
      string,
      string
    >;
    expect(map.get("shorts/קצר")).toBe("2026-02-03");
    expect(map.has("shorts/shorts/קצר")).toBe(false);
  });

  it("omits lastmod when the source has no date", () => {
    const map = buildModMap({ posts: [{ slug: "ללא-תאריך" }] }) as Map<string, string>;
    expect(map.has("ללא-תאריך")).toBe(false);
  });

  it("resolves real source dates for the bundled index", () => {
    const idx = JSON.parse(readFileSync("public/content/_indexes.json", "utf8"));
    const map = buildModMap(idx) as Map<string, string>;
    const dated = (key: string, prefix: string) =>
      (idx[key] ?? []).filter(
        (i: { slug?: string; modified?: string; date?: string }) =>
          i.slug && (i.modified || i.date) && map.has(`${prefix}${i.slug}`),
      ).length;
    const withDate = (key: string) =>
      (idx[key] ?? []).filter(
        (i: { slug?: string; modified?: string; date?: string }) => i.slug && (i.modified || i.date),
      ).length;

    expect(dated("shorts", "shorts/")).toBe(withDate("shorts"));
    expect(dated("success", "success/")).toBe(withDate("success"));
    expect(dated("posts", "")).toBe(withDate("posts"));
  });
});
