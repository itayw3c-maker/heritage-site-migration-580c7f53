// Inline CSS for the /blog pages. Kept as a string and rendered inside the
// route component so the styles ship with the SSR HTML (no extra request,
// no dependency on the Elementor stylesheets).
export const BLOG_CSS = `
.rr-blog{background:#fff;padding:48px 16px 72px;font-family:"Heebo","Noto Sans Hebrew",Arial,sans-serif;color:#1b2733;direction:rtl}
.rr-blog-wrap{max-width:900px;margin:0 auto}
.rr-blog-title{font-size:2rem;font-weight:800;color:#056FC4;margin:0 0 28px;line-height:1.3}
.rr-blog-empty{font-size:1.05rem;color:#5b6b7b}
.rr-blog-grid{list-style:none;margin:0;padding:0;display:grid;gap:28px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.rr-blog-card{border:1px solid #e6ebf1;border-radius:12px;padding:18px;box-shadow:0 2px 10px rgba(5,111,196,.06)}
.rr-blog-card-img{width:100%;height:auto;border-radius:8px;margin-bottom:12px;display:block}
.rr-blog-card-title{font-size:1.15rem;font-weight:700;margin:0 0 8px;line-height:1.4}
.rr-blog-card-title a{color:#1b2733;text-decoration:none}
.rr-blog-card-title a:hover{color:#056FC4}
.rr-blog-card-ex{font-size:.95rem;line-height:1.7;color:#5b6b7b;margin:0 0 12px}
.rr-blog-more{color:#056FC4;font-weight:700;text-decoration:none}
.rr-blog-more:hover{color:#CBA436}
.rr-article{background:#fff;padding:40px 16px 72px;font-family:"Heebo","Noto Sans Hebrew",Arial,sans-serif;color:#1b2733;direction:rtl}
.rr-article-wrap{max-width:820px;margin:0 auto}
.rr-article h1{font-size:2.1rem;font-weight:800;line-height:1.3;color:#1b2733;margin:0 0 10px}
.rr-article-meta{font-size:.9rem;color:#7b8a99;margin-bottom:22px}
.rr-article-hero{width:100%;height:auto;border-radius:12px;margin:0 0 26px;display:block}
.rr-article-body{font-size:1.05rem;line-height:1.9}
.rr-article-body p{margin:0 0 1.1rem}
.rr-article-body h2{font-size:1.5rem;font-weight:700;margin:2.4rem 0 .8rem;color:#056FC4}
.rr-article-body h3{font-size:1.2rem;font-weight:700;margin:1.8rem 0 .6rem}
.rr-article-body ul{list-style:disc;padding-inline-start:1.6em;margin:1em 0}
.rr-article-body ol{list-style:decimal;padding-inline-start:1.6em;margin:1em 0}
.rr-article-body li{margin:.3em 0}
.rr-article-body img{max-width:100%;height:auto;border-radius:.5rem;margin:1.5rem auto;display:block}
.rr-article-body a{color:#056FC4}
.rr-article-body blockquote{border-inline-start:3px solid #CBA436;padding:1rem 1.5rem;margin:1.5rem 0;font-style:italic;background:#f8fafc}
.rr-article-body table{width:100%;border-collapse:collapse;margin:1.5rem 0}
.rr-article-body th,.rr-article-body td{border:1px solid #dbe3ec;padding:.6rem .75rem;text-align:start}
.rr-faq{margin:44px 0 0}
.rr-faq h2{font-size:1.5rem;font-weight:700;color:#056FC4;margin:0 0 16px}
.rr-faq details{border:1px solid #e6ebf1;border-radius:10px;padding:14px 16px;margin:0 0 12px;background:#fbfdff}
.rr-faq summary{font-weight:700;cursor:pointer;font-size:1.02rem}
.rr-faq details p{margin:10px 0 0;line-height:1.8;color:#3d4e5f}
.rr-cta{margin:40px 0 0;background:linear-gradient(90deg,#056FC4,#0a4f8a);color:#fff;border-radius:14px;padding:26px 24px;border-inline-start:6px solid #CBA436}
.rr-cta p{margin:0;font-size:1.12rem;font-weight:700;line-height:1.7;color:#fff}
@media(max-width:600px){.rr-article h1{font-size:1.6rem}.rr-blog-title{font-size:1.6rem}}
`;