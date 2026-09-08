# QA gap remediation — 8 September 2026

Source: the read-only QA report `דוח-QA-פערים-רפאל-שמאות-2026-09-08`, which listed
10 items as still failing on the live site. Every claim was re-verified against
`https://www.rrshamaut.co.il` and against this repository before any change was
made. Two claims did not survive verification and are recorded as such.

## Verification of the report's claims

| Report claim                                  | Verdict                        | Evidence                                                                                                |
| --------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| apex → www is a 302, needs 301                | Confirmed                      | `http://` and `https://rrshamaut.co.il/` both answer `302`                                              |
| Retired URL still 404s instead of 301         | Confirmed                      | `/שמאי-רכוש-תפקידו-וחשיבותו/` → `404`; slug absent from every redirect map                              |
| Homepage `og:type=article`                    | Confirmed                      | live homepage serves `og:type=article`                                                                  |
| "Wrong Open Graph property"                   | Confirmed, wider than reported | `og:site:name` and `article:modified:time` are malformed on all 305 pages                               |
| `SearchAction` not applicable                 | Confirmed                      | `/?s=test` returns the homepage; the app has no search route                                            |
| Self-declared rating                          | Confirmed                      | `aggregateRating` 5/520 in the sitewide JSON-LD, no reviews marked up                                   |
| Two parallel business entities                | Confirmed                      | root `ProfessionalService` had no `@id`, so it never merged with `#organization`                        |
| Hero images without effective `Cache-Control` | Confirmed, cause is the deployment layer | `/wp-content/uploads/` and `/fonts/` return no `Cache-Control`; `_headers` is a Pages feature this Worker deploy ignores, and Workers Assets serves existing files ahead of the Worker — see "Still open" below |
| Font served as `application/octet-stream`     | Confirmed                      | `/fonts/assistant-hebrew.woff2`                                                                         |
| Conversion events missing                     | Partly false                   | `generate_lead` was already implemented; `click_to_phone` and `click_to_whatsapp` were genuinely absent |
| Duplicate `BreadcrumbList`                    | False                          | one rendered `BreadcrumbList`; the second string occurrence is the TanStack hydration payload           |

Also found while verifying, not in the report: trailing-slash normalization
answered with a temporary `307`, and 152 of 305 pages — not just the homepage —
carried `og:type=article` without an article node in their schema graph.

## Implemented

- Open Graph property names keep the underscores that belong to them.
  `og_site_name` is emitted as `og:site_name` and `article_modified_time` as
  `article:modified_time`; only the namespace prefix becomes a colon.
- `og:type` is derived from each page's own schema graph rather than the
  exported value, so the 152 mislabelled pages now declare `website`.
  `article:*` timestamps are dropped on pages that are not articles.
- The `SearchAction` is removed from the `WebSite` node. The site has no search
  route, so the sitelinks searchbox it advertised was a false capability.
- The sitewide business node carries `@id` `…/#organization`, the same identity
  as the node in the per-page graph, so the two descriptions resolve to one
  entity. The calculator page's nested `provider` uses that `@id` too.
- The self-declared `aggregateRating` is removed. A rating a site asserts about
  itself, with no individual reviews on the page, is not eligible for rich
  results and risks a structured-data penalty. The real 5.0/520 Google rating
  stays in the live reviews widget, where it is verifiable.
- Trailing-slash redirects answer `308` instead of `307`, except on file-like
  paths, which stay `307` so a later upload is not blocked by a permanently
  cached redirect.
- `click_to_phone` and `click_to_whatsapp` fire from one delegated document
  listener covering every `tel:` and WhatsApp link, tagged with where on the
  page the tap happened.
- `/שמאי-רכוש-תפקידו-וחשיבותו/` now 301s, via the new
  `src/lib/legacy-redirects.ts`, which is separate from the still-gated
  keyword-consolidation map in `src/lib/redirect-map.ts`.
- The `/jobs/` SEO override is removed. It promised a guide to appraiser
  salaries and career entry on a page whose entire content is a 15-word notice
  that the firm is not recruiting. The page uses its own title again.

## Deviation from the plan, stated explicitly

The report says the retired URL was planned to 301 to the homepage. It points
at `/שמאי-רכוש-לנזקים-והערכות-שווי-תפקיד-עב/` instead — a live article on the
same topic (the property appraiser's role). A redirect to a page that does not
answer the original query is treated as a soft 404 and forfeits the link equity
the URL still holds. Change the single entry in `legacy-redirects.ts` if the
homepage target is required.

## Not addressed here, and why

- **apex → www 301.** Set at the hosting/domain layer, not in this repository.
  Lovable's custom-domain configuration owns that redirect.
- **Homepage H1.** The plan's target wording was not available; the current H1
  is `שמאי רכוש לנזקי רכוש רפאל ריבוח`. Needs the intended copy.
- **Ashdod page content.** Confirmed defect: the page carries a section on
  _vehicle_ damage appraisal ("מה עושה שמאי רכוש כשיש נזק לרכב?" — accident
  repair cost, market value, total loss), a different profession from property
  appraisal. Removing it drops the page from 797 to roughly 640 words, so it
  needs replacement copy rather than deletion.
- **Contact page length.** No target length was available to measure against;
  the page carries 109 words of copy.
- **GSC / GA4 / GTM items.** Require account access. The two new click events
  still need `DebugView` confirmation and marking as key events after release.

## Verified live after deployment

Deployed to production on 08.09.2026 (`b5c22f5`, build `index-DZvb8jTo.js`).
12 of 15 live checks pass: `og:site_name`, no `article:*` on the homepage,
`og:type=website`, no `SearchAction`, no `aggregateRating`, one
`#organization` identity across all five references, the honest `/jobs/`
title, the retired URL's `301`, the `308` upgrade, and both click events
present in the shipped bundle.

## Still open: asset caching and font MIME

The three failing checks are the asset headers, and the cause is the
deployment layer, not this code.

Cloudflare Workers Assets serves a static file that exists directly, ahead of
the Worker, so `src/lib/asset-headers.ts` never sees those requests. Proven on
the live site after deploying: `/fonts/assistant-hebrew.woff2` with a
cache-busting query still returns `application/octet-stream` and no
`Cache-Control`, while `/fonts/does-not-exist.woff2` — a file that is not
there — does reach the Worker and comes back with its redirect handling
applied. `public/_headers` cannot fix it either: that is a Cloudflare Pages
feature, and this project deploys as a Worker with an assets binding.

Two ways to close it:

1. `assets.run_worker_first`, scoped to `/fonts/*` and `/wp-content/*`, passed
   through `nitro.cloudflare.wrangler` in `vite.config.ts`. Nitro's Cloudflare
   preset overrides `assets.binding` and `assets.directory` but merges the
   rest, so the extra key survives. This makes the existing module effective.
   It needs a test deployment: if the host's runtime rejects the glob form,
   static asset serving is what breaks, so verify on the preview URL first.
2. A Cache Rule on the Cloudflare zone setting Edge and Browser TTL for
   `/wp-content/*` and `/fonts/*`. No deployment risk, but it lives outside
   the repository and is invisible to anyone reading this code.

`src/lib/asset-headers.ts` is kept and tested. It is inert for static files
until option 1 ships, and its header comment says so.

## Validation

`src/lib/__tests__/qa-remediation.test.ts` and
`src/lib/__tests__/asset-headers.test.ts` cover the property naming, `og:type`
derivation, `SearchAction` removal, the legacy redirect, asset caching, MIME
correction and the `308` upgrade including the file-like exception. 101 tests
pass. Run the full suite and build before advancing main.
