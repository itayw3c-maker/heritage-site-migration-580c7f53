# SEO remediation — 6 September 2026

Scope: fix confirmed repository defects from the public SEO audit. No ranking-loss cause has been established without Search Console data.

## Implemented

- Render category, shorts and success archive cards and pagination in the initial server HTML. Only the selected page and related cards are sent in the loader payload; browser-side index fetching is removed.
- Keep public, published DB articles in the archive alongside imported content. Deduplicate by slug with DB entries taking precedence. The general information archive includes specialist-category posts.
- Give paginated archives their own canonical URL, title and matching CollectionPage/ItemList structured data. Reject unknown categories and invalid/out-of-range page numbers instead of silently displaying duplicate content.
- Repair Kobi Leibovitz links to the existing dedicated profile. Preserve Rafael's canonical URL and existing legacy redirect.
- Repair natural-disaster navigation links without changing legitimate fire-service links or external URLs.
- Publish all existing category archives in the sitemap. Preserve known source modification dates and omit lastmod when there is no source date instead of substituting every build date.
- Keep archive headings category-specific; escape card titles and JSON-LD content.
- Regression tests cover server-only rendering, crawlable pagination, canonical identity, archive boundary cases, deduplication, navigation and sitemap dates.

## Original task disposition

| Audit task | Status / next evidence |
|---|---|
| GSC/GA4 loss baseline and affected queries | Requires account exports; no historical data was available. |
| Index coverage and manual actions | Requires GSC. Public 200/index responses alone do not prove indexing. |
| Cloudflare events and configuration | Requires account event/rule data; no security settings were changed. |
| Natural-disaster footer link | Fixed by label-aware normalization before SSR. |
| Kobi menu link | Fixed to the already implemented dedicated profile. |
| Archive rendering | Confirmed client-only index dependency and corrected to server rendering. |
| Technical crawl/canonical/redirects | Archive canonical and invalid pagination defects fixed. Earlier sample found 33 successful HTML pages with metadata; full historic-URL coverage is not established. |
| Water/flood cannibalization | Not proven; preserve existing URLs until query/page data supports consolidation. |
| Improve three highest-loss service pages | Requires the baseline to select the actual affected pages. No unsupported ranking guesses or new client claims added. |
| Lead measurement | Existing code emits generate_lead after successful sendLeadPayload; phone/WhatsApp clicks have separate events. End-to-end delivery and GA4 collection still need controlled validation. |
| PageSpeed/Core Web Vitals | No new field measurements available. Archive initial rendering and avoiding full-index client loading addressed; do not claim improved scores. |
| Success stories/internal links | Existing stories and water-service case link retained. New factual cases require approved source material; not fabricated. |
| Business Profile consistency | Requires verified business profile data. No invented branch details or reviews. |
| Structured data | Archive CollectionPage/ItemList now matches displayed cards. This does not certify every site's schema type or rich-result eligibility. |
| Competitors/lost backlinks | Requires affected queries and backlink data to target the investigation. |
| Weekly client reporting | This file records implementation and evidence gaps; no recurring automation or messages created. |

## Validation and release

The dedicated local suite has 10 passing tests. Run the repository's complete CI test and build jobs before advancing main. After publishing, inspect initial HTML for category page 1 and 2, the corrected navigation targets, and the sitemap. This document does not assert live deployment or ranking recovery.

User preference: the homepage consultation button enlargement was reverted previously; this change does not touch button styles.
