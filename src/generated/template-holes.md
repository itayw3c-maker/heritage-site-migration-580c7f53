# Template Holes
For each Elementor Theme Builder template we identify the widgets whose inner content is replaced at runtime. The outer widget wrapper (`.elementor-element .elementor-widget`) is preserved; only the `.elementor-widget-container` (or the `<h1>` inside it for the title) has its innerHTML swapped for the marker.

## post — `data-elementor-type="single-post" data-elementor-id="1150"`
Source sample: `tpl-post-1150-sample.html`

Widgets replaced with markers:
- `data-widget_type="theme-post-title.default"` × 1 → `__HOLE_TITLE__` (inner text of H1 replaced)
- `data-widget_type="theme-post-content.default"` × 1 → `__HOLE_CONTENT__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="breadcrumbs.default"` × 1 → `__HOLE_BREADCRUMB__` (innerHTML of .elementor-widget-container replaced)
- `data-widget_type="post-info.default"` × 1 → `__HOLE_DATE__` (innerHTML of .elementor-widget-container replaced)

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
