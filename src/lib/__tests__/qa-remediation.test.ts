import { describe, expect, it } from "vitest";
import {
  buildSeoHead,
  ogPropertyName,
  resolveOgType,
  stripUnsupportedSearchAction,
} from "@/lib/seo-head";
import { resolveLegacyRedirect } from "@/lib/legacy-redirects";

function propertyOf(head: ReturnType<typeof buildSeoHead>, property: string) {
  return head.meta.find((entry) => entry.property === property)?.content;
}

describe("Open Graph property names", () => {
  it("turns only the namespace underscore into a colon", () => {
    expect(ogPropertyName("og_site_name")).toBe("og:site_name");
    expect(ogPropertyName("article_modified_time")).toBe("article:modified_time");
    expect(ogPropertyName("article_published_time")).toBe("article:published_time");
    expect(ogPropertyName("og_locale")).toBe("og:locale");
  });

  it("leaves keys without a known namespace alone", () => {
    expect(ogPropertyName("description")).toBe("description");
  });

  it("emits the corrected names in the head fragment", () => {
    const head = buildSeoHead({
      og: {
        og_type: "article",
        og_site_name: "רפאל שמאות רכוש | RR",
        article_modified_time: "2026-07-09T07:03:07+00:00",
      },
    });

    expect(propertyOf(head, "og:site_name")).toBe("רפאל שמאות רכוש | RR");
    expect(propertyOf(head, "article:modified_time")).toBe("2026-07-09T07:03:07+00:00");
    expect(propertyOf(head, "og:site:name")).toBeUndefined();
    expect(propertyOf(head, "article:modified:time")).toBeUndefined();
  });
});

describe("og:type derivation", () => {
  it("is article only when the graph carries an article node", () => {
    expect(resolveOgType({ "@graph": [{ "@type": "Article" }] })).toBe("article");
    expect(resolveOgType({ "@graph": [{ "@type": ["BlogPosting", "WebPage"] }] })).toBe("article");
  });

  it("is website for pages the WordPress export mislabelled as article", () => {
    expect(
      resolveOgType({
        "@graph": [{ "@type": "WebPage" }, { "@type": "BreadcrumbList" }, { "@type": "WebSite" }],
      }),
    ).toBe("website");
    expect(
      resolveOgType({ "@graph": [{ "@type": ["Organization", "ProfessionalService"] }] }),
    ).toBe("website");
    expect(resolveOgType(null)).toBe("website");
    expect(resolveOgType({})).toBe("website");
  });
});

describe("article timestamps", () => {
  it("are dropped on pages that are not articles", () => {
    const head = buildSeoHead({
      og: {
        og_type: "website",
        og_title: "צור קשר",
        article_modified_time: "2026-07-09T07:03:07+00:00",
        article_published_time: "2025-01-01T00:00:00+00:00",
      },
    });

    expect(propertyOf(head, "og:type")).toBe("website");
    expect(propertyOf(head, "article:modified_time")).toBeUndefined();
    expect(propertyOf(head, "article:published_time")).toBeUndefined();
  });

  it("are kept on real articles", () => {
    const head = buildSeoHead({
      og: { og_type: "article", article_modified_time: "2026-07-09T07:03:07+00:00" },
    });

    expect(propertyOf(head, "article:modified_time")).toBe("2026-07-09T07:03:07+00:00");
  });
});

describe("stripUnsupportedSearchAction", () => {
  const withSearch = () => ({
    "@graph": [
      { "@type": "WebPage", "@id": "https://www.rrshamaut.co.il/" },
      {
        "@type": "WebSite",
        "@id": "https://www.rrshamaut.co.il/#website",
        name: "רפאל שמאות רכוש",
        potentialAction: [
          {
            "@type": "SearchAction",
            target: { urlTemplate: "https://www.rrshamaut.co.il/?s={search_term_string}" },
          },
        ],
      },
    ],
  });

  it("removes the sitelinks searchbox the site has no search route for", () => {
    const out = stripUnsupportedSearchAction(withSearch()) as {
      "@graph": Array<Record<string, unknown>>;
    };
    const website = out["@graph"].find((n) => n["@type"] === "WebSite")!;
    expect(website).not.toHaveProperty("potentialAction");
    expect(JSON.stringify(out)).not.toContain("SearchAction");
  });

  it("keeps every other node and property intact", () => {
    const out = stripUnsupportedSearchAction(withSearch()) as {
      "@graph": Array<Record<string, unknown>>;
    };
    expect(out["@graph"]).toHaveLength(2);
    const website = out["@graph"].find((n) => n["@type"] === "WebSite")!;
    expect(website.name).toBe("רפאל שמאות רכוש");
    expect(website["@id"]).toBe("https://www.rrshamaut.co.il/#website");
  });

  it("does not mutate the input record", () => {
    const input = withSearch();
    stripUnsupportedSearchAction(input);
    expect(JSON.stringify(input)).toContain("SearchAction");
  });

  it("passes through schemas with nothing to strip", () => {
    const graphOnly = { "@graph": [{ "@type": "Article" }] };
    expect(stripUnsupportedSearchAction(graphOnly)).toBe(graphOnly);
    expect(stripUnsupportedSearchAction(null)).toBeNull();
  });
});

describe("legacy redirects", () => {
  it("sends the retired appraiser-role article to the live article on that topic", () => {
    expect(resolveLegacyRedirect("שמאי-רכוש-תפקידו-וחשיבותו")).toBe(
      `/${encodeURI("שמאי-רכוש-לנזקים-והערכות-שווי-תפקיד-עב")}/`,
    );
  });

  it("returns null for paths with no legacy entry", () => {
    expect(resolveLegacyRedirect("about")).toBeNull();
    expect(resolveLegacyRedirect("")).toBeNull();
  });

  it("never redirects to itself", () => {
    const target = resolveLegacyRedirect("שמאי-רכוש-תפקידו-וחשיבותו");
    expect(target).not.toBe(`/${encodeURI("שמאי-רכוש-תפקידו-וחשיבותו")}/`);
  });
});
