import { describe, expect, it } from "vitest";
import { overrideSeoIdentity } from "@/lib/seo-head";

const RAFAEL = "https://www.rrshamaut.co.il/about/השמאי-רפאל-ריבוח-מייסד-ובעלים/";
const LEGACY = "https://www.rrshamaut.co.il/about/השמאי-רפאל-ריבוח-מייסד-ובעלים-2/";
const KOBI = "https://www.rrshamaut.co.il/about/עורך-דין-קובי-ליבוביץ/";

function lowerEncoded(url: string) {
  return encodeURI(url).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase());
}

describe("overrideSeoIdentity URL identity", () => {
  it("rewrites the legacy -2 profile URL in og:url and schema, in every encoding", () => {
    const rec = {
      canonical: RAFAEL,
      og: { og_url: LEGACY },
      schema: JSON.stringify({
        "@graph": [
          { "@type": "WebPage", "@id": LEGACY, url: lowerEncoded(LEGACY) },
          { "@type": "BreadcrumbList", "@id": `${encodeURI(LEGACY)}#breadcrumb` },
        ],
      }),
    } as never;

    const out = overrideSeoIdentity(rec, { canonical: RAFAEL, legacyUrls: [LEGACY] })!;

    expect(out.canonical).toBe(RAFAEL);
    expect(out.og?.og_url).toBe(RAFAEL);
    expect(out.schema).not.toMatch(/-2\//);
    expect(out.schema).toContain(RAFAEL);
  });

  it("maps a percent-encoded source canonical onto the overridden canonical", () => {
    const rec = {
      canonical: RAFAEL,
      og: { og_url: RAFAEL },
      schema: JSON.stringify({
        "@graph": [{ "@type": "WebPage", "@id": lowerEncoded(RAFAEL), url: encodeURI(RAFAEL) }],
      }),
    } as never;

    const out = overrideSeoIdentity(rec, { canonical: KOBI })!;

    expect(out.canonical).toBe(KOBI);
    expect(out.og?.og_url).toBe(KOBI);
    expect(out.schema).not.toContain("רפאל-ריבוח");
    expect(out.schema).not.toContain(lowerEncoded(RAFAEL));
    expect(out.schema).toContain(KOBI);
  });
});
