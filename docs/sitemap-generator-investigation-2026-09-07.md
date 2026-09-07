# Sitemap / archive-index generator investigation (2026-09-07)

Read-only comparison. `scripts/generate-sitemap.mjs` was run in an isolated copy
(`/tmp/sgen`); no committed generated file was regenerated or overwritten.

## Counts

| Artifact | Current committed | Regenerated (isolated) |
| --- | --- | --- |
| `public/sitemap.xml` `<loc>` | 303 | 308 |
| `public/sitemap.xml` `<lastmod>` | 303 | 153 |
| `archive-index.json` posts / shorts / success | 153 / 47 / 31 | 153 / 47 / 31 |
| categories | 6 | 6 |

`public/content/_indexes.json` (source) holds 153 posts, 47 shorts, 31 success,
6 categories — identical to the bundled index, so `archive-index.json` is NOT
stale or shrunken.

URL diff: 0 URLs exist only in the current sitemap; 5 exist only in the
regenerated one — the English category archives
(`property-damage-assessment`, `fire-damage`, `natural-disaster-insurance`,
`construction-defects`, `water-damage-insurance`). The current sitemap lists
only the Hebrew `מידע-מקצועי` category.

## Root cause of the earlier "shrink"

Two independent generator defects, both lossy against the committed files:

1. **lastmod loss (303 → 153).** The generator builds `modMap` keyed by
   `item.slug` from `_indexes.json`, but shorts and success items carry bare
   slugs (`video-on-flood-damage-...`, `170k-pipe-burst-settlement`) while their
   content files live at `public/content/shorts/*.json` and
   `public/content/success/*.json`. The sitemap loop keys on the file path, so
   only the 153 root-level post slugs match. Static pages never get a lastmod at
   all. Result: 150 previously-published `<lastmod>` values are dropped.
2. **Category set drift (+5 thin archives).** The generator emits one URL per
   entry in `_indexes.json.categories`, including the five English category
   slugs that the curated sitemap deliberately excludes.

## Conclusion

Do not run `scripts/generate-sitemap.mjs` against `public/` until both defects
are fixed (slug-prefix-aware lastmod lookup + explicit category allowlist).
No generated file was changed by this investigation.
