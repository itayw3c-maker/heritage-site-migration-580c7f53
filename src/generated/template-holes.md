# Template Holes
For each Elementor Theme Builder template we identify the widgets whose inner content is replaced at runtime. The outer widget wrapper (`.elementor-element .elementor-widget`) is preserved; only the `.elementor-widget-container` (or the `<h1>` inside it for the title) has its innerHTML swapped for the marker.

## post — `data-elementor-type="single-post" data-elementor-id="1150"`
Source sample: `tpl-post-1150-sample.html`

Widgets replaced with markers:
- `data-widget_type="theme-post-title.default"` × 1 → `__HOLE_TITLE__` (inner text of H1 replaced)
- `data-widget_type="theme-post-content.default"` × 1 → `__HOLE_CONTENT__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="breadcrumbs.default"` × 1 → `__HOLE_BREADCRUMB__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="post-info.default"` × 1 → `__HOLE_DATE__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="posts.classic"` (data-id `147aa03`, "מאמרים נוספים") × 1 → `__HOLE_RELATED_1__` (innerHTML of `.elementor-posts-container` replaced; outer widget + container preserved). Filled at runtime by SingleTemplate with up to 4 posts sharing at least one category with the current post (excludes self); each item uses the same `article.elementor-post` markup as the original (title link, excerpt, read-more).
- Global footer widget `data-id="92ba2bb"` ("מאמרים חשובים", `posts.classic` in `src/generated/footer.html`) → NOT marker-based. At runtime, SingleTemplate replaces the `.elementor-posts-container` innerHTML with up to 8 related-by-category posts (title-only markup as in the original footer) and restores the original HTML on unmount so non-post pages keep the static list.

If the index (`/content/_indexes.json`) fails to load, both widgets are left empty (widget 1) or unchanged (widget 2, footer) — never broken.

## shorts — `data-elementor-type="single-post" data-elementor-id="4437"`
Source sample: `tpl-shorts-4437-sample.html`

Widgets replaced with markers:
- `data-widget_type="theme-post-title.default"` × 1 → `__HOLE_TITLE__` (inner text of H1 replaced)
- `data-widget_type="theme-post-content.default"` × 1 → `__HOLE_CONTENT__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="breadcrumbs.default"` × 1 → `__HOLE_BREADCRUMB__` (innerHTML of .elementor-widget-container replaced)

## movie — `data-elementor-type="single-post" data-elementor-id="3614"`
Source sample: `tpl-movie-3614-sample.html`

Widgets replaced with markers:
- `data-widget_type="theme-post-title.default"` × 1 → `__HOLE_TITLE__` (inner text of H1 replaced)
- `data-widget_type="breadcrumbs.default"` × 1 → `__HOLE_BREADCRUMB__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="video.default"` (data-id `e6455e3`) × 1 → `__HOLE_VIDEO_SETTINGS__` (value of `data-settings` attribute replaced; expects JSON string, HTML-escaped to `&quot;` on fill; falls back to `{}` if `video_settings` is missing on the record)

## success — `data-elementor-type="single-page" data-elementor-id="3342"`
Source sample: `tpl-success-3342-sample.html`

Widgets replaced with markers:
- `data-widget_type="theme-post-title.default"` × 1 → `__HOLE_TITLE__` (inner text of H1 replaced)
- `data-widget_type="theme-post-content.default"` × 1 → `__HOLE_CONTENT__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="breadcrumbs.default"` × 1 → `__HOLE_BREADCRUMB__` (innerHTML of .elementor-widget-container replaced)

## service — `data-elementor-type="single-page" data-elementor-id="4670"`
Source sample: `tpl-service-4670-sample.html`

Widgets replaced with markers:
- `data-widget_type="theme-post-title.default"` × 1 → `__HOLE_TITLE__` (inner text of H1 replaced)
- `data-widget_type="theme-post-content.default"` × 1 → `__HOLE_CONTENT__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="breadcrumbs.default"` × 1 → `__HOLE_BREADCRUMB__` (innerHTML of .elementor-widget-container replaced)
