# Sitemap generator investigation (2026-09-07), corrected

Correction notice: the first version of this document treated the committed
303-URL `public/sitemap.xml` snapshot as the authority. It is not. Per
`docs/seo-remediation-2026-09-06.md`, the September 6 remediation
**intentionally** (a) published all six valid category archives and
(b) omitted `<lastmod>` wherever no real source date exists, instead of
stamping every URL with the build date. The live sitemap serves 308 URLs.
The 303-URL committed file is a stale pre-remediation snapshot.

`scripts/generate-sitemap.mjs` was verified in an isolated copy
(`/tmp/gencheck`); no committed generated file was overwritten.

## Counts

| Artifact | Stale committed snapshot | Generator before fix | Generator after fix |
| --- | --- | --- | --- |
| `<loc>` | 303 | 308 | 308 |
| `<lastmod>` | 303 (incl. fabricated build dates) | 153 | 231 |
| `/category/` URLs | 1 | 6 | 6 |
| index posts / shorts / success | 153 / 47 / 31 | 153 / 47 / 31 | 153 / 47 / 31 |

231 = every entry in `_indexes.json` that actually has a `modified`/`date`
value (153 posts + 47 shorts + 31 success). Category archives, `/shorts/`,
`/success/`, the home page and static pages have no page-specific source date
and therefore correctly carry no `<lastmod>`.

## Two different things, previously conflated

1. **Intentional, not a defect — 303 → 308 and fewer lastmods.** The five
   additional URLs are the valid English category archives
   (`property-damage-assessment`, `fire-damage`,
   `natural-disaster-insurance`, `construction-defects`,
   `water-damage-insurance`), added deliberately on September 6. The drop in
   `<lastmod>` count for URLs with no known source date is also deliberate:
   the old snapshot's dates for those URLs were build timestamps, not content
   dates. No category allowlist is to be added, and no fabricated dates are to
   be restored.
2. **Real defect — known nested dates were being lost.** `modMap` was keyed by
   the bare `item.slug` from `_indexes.json`, while shorts and success content
   files live under `public/content/shorts/` and `public/content/success/`.
   The sitemap loop keys on the content path, so 78 genuine source dates
   (47 shorts + 31 success) never matched and were silently dropped.

## Fix applied

`scripts/sitemap-lastmod.mjs` (new) owns the mapping and is imported by
`scripts/generate-sitemap.mjs`:

- shorts → `shorts/{slug}`, success → `success/{slug}`, posts stay at the root;
- the prefix is not applied twice if an index slug already carries it;
- an entry with no `modified`/`date` produces no `<lastmod>` at all.

Regression coverage: `src/lib/__tests__/sitemap-lastmod.test.ts` asserts nested
path keying, no double prefix, omission of unknown dates, and that every dated
entry in the real bundled index resolves to a path the sitemap loop uses.

## Status

The generator now reproduces the intended September 6 output (308 URLs, six
category archives) and no longer loses the 78 known nested dates. The stale
303-URL committed snapshot was left untouched by this investigation — it was
neither restored nor treated as a target.
