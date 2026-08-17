import { useEffect, useMemo, useState } from "react";
import postTpl from "@/generated/templates/post.html?raw";
import shortsTpl from "@/generated/templates/shorts.html?raw";
import movieTpl from "@/generated/templates/movie.html?raw";
import successTpl from "@/generated/templates/success.html?raw";
import serviceTpl from "@/generated/templates/service.html?raw";
import { enhanceElementor } from "@/lib/elementor-enhance";
import { improveMigratedHtml } from "@/lib/migrated-html";
import { getSeoOverride, isExpertReviewedPath } from "@/lib/seo-overrides";
import {
  buildRelated,
  escAttr,
  type IndexPostLite,
  type RelatedHtml,
} from "@/lib/related-posts";

export type SingleType = "post" | "shorts" | "movie" | "success" | "service" | "static";

export interface SingleRecord {
  type: SingleType;
  id: number;
  title: string;
  breadcrumb_html?: string;
  content_html?: string;
  updated_date?: string;
  meta_title?: string;
  meta_description?: string;
  video_settings?: string;
  main_html?: string;
  body_class?: string;
  styles_css?: string;
  featured_image_url?: string;
}

interface IndexBundleLite {
  posts: IndexPostLite[];
}

let indexCache: IndexBundleLite | null = null;
let indexPromise: Promise<IndexBundleLite | null> | null = null;
function loadIndex(): Promise<IndexBundleLite | null> {
  if (indexCache) return Promise.resolve(indexCache);
  if (!indexPromise) {
    indexPromise = fetch("/content/_indexes.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: IndexBundleLite | null) => {
        indexCache = d;
        return d;
      })
      .catch(() => null);
  }
  return indexPromise;
}

const TEMPLATES: Partial<Record<SingleType, string>> = {
  post: postTpl,
  shorts: shortsTpl,
  movie: movieTpl,
  success: successTpl,
  service: serviceTpl,
};

function bodyClassFor(type: SingleType, id: number): string {
  const base =
    "wp-custom-logo wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default esm-default hello-elementor-default elementor-default elementor-kit-7";
  switch (type) {
    case "post":
      return `rtl wp-singular post-template-default single single-post postid-${id} single-format-standard ${base} elementor-page-1150`;
    case "shorts":
      return `rtl wp-singular shorts-template-default single single-shorts postid-${id} ${base} elementor-page-4437`;
    case "movie":
      return `rtl wp-singular movie-template-default single single-movie postid-${id} ${base} elementor-page-3614`;
    case "success":
      return `rtl wp-singular success-template-default single single-success postid-${id} ${base} elementor-page-3342`;
    case "service":
      return `rtl wp-singular page-template-default page page-id-${id} ${base} elementor-page-4670`;
    case "static":
      return base;
  }
}

function fill(tpl: string, rec: SingleRecord, relatedHtml1: string): string {
  const videoSettings = (rec.video_settings ?? "{}").replace(/"/g, "&quot;");
  const featuredImage =
    rec.type === "success" ? buildFeaturedImage(rec.featured_image_url, rec.title ?? "") : "";
  const content = improveMigratedHtml(rec.content_html ?? "", rec.title ?? "");
  return tpl
    .split("__HOLE_TITLE__").join(rec.title ?? "")
    .split("__HOLE_CONTENT__").join(content)
    .split("__HOLE_BREADCRUMB__").join(rec.breadcrumb_html ?? "")
    .split("__HOLE_DATE__").join(rec.updated_date ?? "")
    .split("__HOLE_VIDEO_SETTINGS__").join(videoSettings)
    .split("__HOLE_RELATED_1__").join(relatedHtml1)
    .split("__HOLE_FEATURED_IMAGE__").join(featuredImage);
}

function buildFeaturedImage(url: string | undefined, alt: string): string {
  if (!url) return "";
  return `<img alt="${escAttr(alt)}" class="attachment-large size-large" src="${escAttr(url)}" loading="lazy" />`;
}

function buildMediaSummary(record: SingleRecord): string {
  const isShort = record.type === "shorts";
  const title = escAttr(record.title ?? (isShort ? "המידע המקצועי" : "הסרטון המקצועי"));
  const description = escAttr(record.meta_description ?? "");
  return `<section class="rr-video-summary" aria-label="מידע נוסף על ${title}">
    <h2>${isShort ? "הנקודות החשובות בקצרה" : "על מה מדבר הסרטון?"}</h2>
    ${description ? `<p>${description}</p>` : ""}
    <p>המידע בעמוד מסייע לבעלי נכסים להבין את שלבי התיעוד, הערכת הנזק וההתנהלות מול חברת הביטוח. כל אירוע נזק מחייב בדיקה מקצועית בהתאם לנסיבות, לפוליסה ולמצב הנכס.</p>
    <p><a href="/category/%D7%9E%D7%99%D7%93%D7%A2-%D7%9E%D7%A7%D7%A6%D7%95%D7%A2%D7%99/">למאמרים המקצועיים</a> · <a href="/about/">אודות רפאל שמאות רכוש</a> · <a href="/shorts/">לסרטונים נוספים</a></p>
  </section>`;
}

function buildSuccessSummary(record: SingleRecord): string {
  const title = escAttr(record.title ?? "סיפור ההצלחה");
  const description = escAttr(record.meta_description ?? "");
  return `<section class="rr-video-summary rr-success-summary" aria-label="פרטים נוספים על ${title}">
    <h2>עיקרי המקרה</h2>
    ${description ? `<p>${description}</p>` : ""}
    <p>התוצאה המוצגת מתייחסת למקרה המסוים ולנסיבותיו. גובה הפיצוי והטיפול בכל תביעה נקבעים לפי היקף הנזק, תנאי הפוליסה, התיעוד והבדיקה המקצועית.</p>
    <p><a href="/success/">לסיפורי הצלחה נוספים</a> · <a href="/%D7%99%D7%99%D7%A2%D7%95%D7%A5-%D7%95%D7%9C%D7%99%D7%95%D7%95%D7%99-%D7%AA%D7%91%D7%99%D7%A2%D7%95%D7%AA-%D7%91%D7%99%D7%98%D7%95%D7%97/">ייעוץ וליווי תביעות ביטוח</a> · <a href="/%D7%A6%D7%95%D7%A8-%D7%A7%D7%A9%D7%A8/">יצירת קשר</a></p>
  </section>`;
}

function buildTopicHubCallout(record: SingleRecord, slug?: string): string {
  const topic = `${slug ?? ""} ${record.title ?? ""}`;
  const hub = /נזקי-אש|נזק-אש|שריפ|פיח/.test(topic)
    ? {
        href: "/%D7%A0%D7%96%D7%A7%D7%99-%D7%90%D7%A9-%D7%95%D7%A4%D7%99%D7%97/",
        label: "שמאי נזקי אש, שריפה ופיח",
        text: "להערכת נזקי שריפה, עשן ופיח ולליווי מקצועי מול חברת הביטוח, עברו לעמוד השירות המרכזי.",
      }
    : /נזקי-מים|נזק-מים|נזיל|רטיבות|צנרת|הצפ|קפילר/.test(topic)
      ? {
          href: "/%D7%A0%D7%96%D7%A7%D7%99-%D7%9E%D7%99%D7%9D-%D7%94%D7%A6%D7%A4%D7%94-%D7%95%D7%A8%D7%98%D7%99%D7%91%D7%95%D7%AA/",
          label: "שמאי נזקי מים, הצפה ורטיבות",
          text: "להערכת נזקי מים, תיעוד רטיבות וליווי תביעת הביטוח, עברו לעמוד השירות המרכזי.",
        }
      : null;
  if (!hub) return "";
  return `<aside class="rr-video-summary rr-topic-hub" aria-label="עמוד השירות המרכזי">
    <h2>המשך לעמוד השירות המרכזי</h2>
    <p>${hub.text}</p>
    <p><a href="${hub.href}">${hub.label}</a> · <a href="/%D7%A6%D7%95%D7%A8-%D7%A7%D7%A9%D7%A8/">ייעוץ ראשוני</a></p>
  </aside>`;
}

function buildExpertPanel(record: SingleRecord, slug?: string): string {
  const title = record.title ?? "";
  const priorityStaticPage =
    record.type === "static" &&
    (/שמאי נזקי מים הצפה ורטיבות/.test(title) || /שאלות תשובות/.test(title));
  if (!isExpertReviewedPath(slug) && !priorityStaticPage) return "";
  return `<aside class="rr-video-summary rr-expert-review" aria-label="בדיקה מקצועית ומחבר התוכן">
    <h2>נכתב ונבדק מקצועית</h2>
    <p><strong>רפאל ריבוח</strong> — שמאי רכוש, סוקר סיכונים ומאתר ליקויי בנייה מורשה, המתמחה בהערכת נזקי מים, אש ורכוש ובליווי תביעות ביטוח.</p>
    <p>המידע נועד להסביר עקרונות מקצועיים כלליים. ההערכה בכל מקרה נקבעת לאחר בדיקת הנכס, המסמכים, היקף הנזק ותנאי הפוליסה.</p>
    <p><strong>מקורות רשמיים לעיון נוסף:</strong> <a href="https://haotzarsheli.mof.gov.il/Subject/Pages/Choosing-Apartment-Insurance.aspx" rel="external">מדריך משרד האוצר לביטוח דירה</a> · <a href="https://www.gov.il/BlobFolder/dynamiccollectorresultitem/notice-2022-9-2/he/claim-solution-2022-9-2-pdf.pdf" rel="external">חוזר רשות שוק ההון לבירור ויישוב תביעות</a></p>
    <p><a href="/about/%D7%94%D7%A9%D7%9E%D7%90%D7%99-%D7%A8%D7%A4%D7%90%D7%9C-%D7%A8%D7%99%D7%91%D7%95%D7%97-%D7%9E%D7%99%D7%99%D7%A1%D7%93-%D7%95%D7%91%D7%A2%D7%9C%D7%99%D7%9D/">לפרופיל המקצועי של רפאל ריבוח</a> · <a href="/about/">אודות המשרד</a></p>
  </aside>`;
}

function buildSharedPipeAnswer(record: SingleRecord): string {
  if (record.type !== "static" || !/שאלות תשובות/.test(record.title ?? "")) return "";
  return `<section class="rr-video-summary rr-direct-answer" aria-label="תשובה מהירה על ביטוח צנרת משותפת">
    <h2>מי אחראי לנזק בצנרת משותפת בבניין?</h2>
    <p><strong>התשובה הקצרה:</strong> האחריות נקבעת לפי מיקום הצינור, את מי הוא משרת ומה גרם לנזק. צנרת המשרתת את כלל בעלי הדירות או חלקם עשויה להיחשב רכוש משותף; צינור המשרת דירה אחת בלבד יהיה בדרך כלל באחריות בעל הדירה.</p>
    <h3>מה בודקים לפני שקובעים אחריות?</h3>
    <p>בודקים את תשריט הצנרת, התקנון, ממצאי איתור המקור, היקף הנזק ותנאי פוליסת המבנה או כתב השירות. חיבור בין צינור פרטי לצינור משותף מחייב בדיקה מקצועית ואינו מוכרע רק לפי מיקום סימן הרטיבות.</p>
    <h3>מתי כדאי להזמין שמאי רכוש פרטי?</h3>
    <p>כאשר קיימת מחלוקת על מקור הנזק, אחריות הבית המשותף, היקף השיקום או הצעת הפיצוי. לפני תיקון נרחב מומלץ לתעד את הממצאים, לשמור דוחות, תמונות, הצעות מחיר והתכתבויות עם חברת הביטוח או ועד הבית.</p>
    <p><strong>מידע משלים:</strong> <a href="/שמאי-נזקי-צנרת/">מדריך שמאי לנזקי צנרת</a> · <a href="/shorts/video-leak-4-inch-shared-building-pipe-responsibility-house-committee/">סרטון: אחריות על צינור משותף</a> · <a href="/נזקי-מים-הצפה-ורטיבות/">שירות שמאי נזקי מים</a></p>
  </section>`;
}

function buildServiceDirectAnswer(record: SingleRecord, slug?: string): string {
  const path = (slug ?? "").replace(/^\/+|\/+$/g, "");
  const answer = path === "נזקי-מים-הצפה-ורטיבות"
    ? {
        label: "תשובה מהירה על שמאות נזקי מים",
        question: "מה עושה שמאי נזקי מים?",
        text: "שמאי נזקי מים מתעד את מקור הנזק והיקפו, בודק אילו חלקי מבנה ותכולה נפגעו, מעריך את עלויות הייבוש והשיקום ומכין חוות דעת מנומקת לצורך תביעת הביטוח.",
        evidence: "לפני תיקונים נרחבים שומרים תמונות וסרטונים, דוח איתור נזילה, מדידות לחות, חשבוניות, הצעות מחיר, רשימת תכולה והתכתבויות עם חברת הביטוח. סימן הרטיבות לבדו אינו תמיד מצביע על מקור הכשל.",
        timing: "כדאי להזמין שמאי מוקדם ככל האפשר, לאחר עצירת סכנה מיידית ולפני פינוי, ייבוש או שיקום שמשנים את מצב הנכס. במקרה חירום פועלים תחילה למניעת נזק נוסף ומתעדים כל פעולה.",
        related: '<a href="/נזקי-מים-עליה-קפילארית-כיצד-לפעול/">מדריך עלייה קפילרית</a> · <a href="/movie/mapping-moisture-after-plumbing-damage/">סרטון מיפוי לחות</a> · <a href="/success/62000-nis-compensation-water-damage-claim/">מקרה נזקי מים</a>',
      }
    : path === "נזקי-אש-ופיח"
      ? {
          label: "תשובה מהירה על שמאות נזקי אש",
          question: "מה עושה שמאי נזקי אש ופיח?",
          text: "שמאי נזקי אש ופיח מתעד נזקי שריפה, עשן, פיח ומי כיבוי למבנה ולתכולה, מעריך את עלויות הניקוי, הפינוי והשיקום ומכין חוות דעת מנומקת לצורך תביעת הביטוח.",
          evidence: "שומרים תצלומים וסרטונים של הזירה, דוח כבאות, רשימת תכולה, חשבוניות, הצעות מחיר והתכתבויות. אין לפנות פריטים או להתחיל שיקום נרחב לפני תיעוד, אלא אם נדרש טיפול מיידי מטעמי בטיחות.",
          timing: "כדאי להזמין שמאי לאחר שהזירה בטוחה לכניסה ולפני פינוי ותיקון משמעותיים. השמאי בוחן גם נזק סמוי מעשן, פיח, חום ומי כיבוי שאינו ניכר בצילום כללי.",
          related: '<a href="/איך-שמאי-נזקי-אש-יכול-למקסם-את-הפיצויים/">מדריך לתביעת נזקי אש</a> · <a href="/movie/fire-damage-no-building-insurance-cost/">סרטון על הערכת נזקי אש</a> · <a href="/success/תשלום-בגין-נזקי-שריפה-ע״ס-125000/">מקרה נזקי שריפה</a>',
        }
      : path === "נזקי-מים-עליה-קפילארית-כיצד-לפעול"
        ? {
            label: "תשובה מהירה על עלייה קפילרית",
            question: "מהי עלייה קפילרית ואיך מזהים אותה?",
            text: "עלייה קפילרית היא תנועת לחות כלפי מעלה דרך נקבוביות הטיח, הבלוקים וחומרי המבנה. סימנים אופייניים הם קילופי צבע וטיח, התנפחות סמוך לפנלים, מלחים ורטיבות בחלק התחתון של הקיר.",
            evidence: "ממפים את גובה ופיזור הלחות, מבצעים מדידות מתאימות ובודקים צנרת, איטום, ניקוז ולחות קרקע. אי אפשר לקבוע את המקור לפי סימן חזותי בלבד, ולכן חשוב לתעד גם את מצב הריצוף, הפנלים והחדרים הסמוכים.",
            timing: "מזמינים שמאי לאחר עצירת סכנה מיידית ולפני החלפת ריצוף, קילוף טיח או עבודות שיקום נרחבות. יש לשמור דוחות איתור, מדידות, תמונות, חשבוניות ותנאי פוליסה כדי לבחון אחריות וכיסוי.",
            related: '<a href="/נזקי-מים-הצפה-ורטיבות/">שירות שמאי נזקי מים</a> · <a href="/movie/capillary-moisture-after-plumbing-damage/">סרטון על לחות קפילרית</a> · <a href="/shorts/video-moisture-content-test-standards-institute-capillary-rise/">בדיקת תכולת רטיבות</a>',
          }
        : path === "נזקי-טבע-שיטפונות-וסערה"
          ? {
              label: "תשובה מהירה לאחר שיטפון או סערה",
              question: "מה עושים מיד אחרי נזקי שיטפון או סערה?",
              text: "לאחר שמוודאים שהכניסה לנכס בטוחה, מתעדים את הנזק לפני פינוי ותיקון, נוקטים פעולות סבירות למניעת החמרה, מדווחים לחברת הביטוח ושומרים קבלות ודוחות.",
              evidence: "מצלמים את מקור החדירה, מפלס המים, כל חדר ופריט שנפגע, ושומרים נתוני מזג אוויר, דוחות חירום, רשימות תכולה, הצעות מחיר וחשבוניות. אין להשליך רכוש שניזוק לפני תיעוד ואישור, למעט מפגע בטיחותי.",
              timing: "מזמינים שמאי מוקדם ככל האפשר, לאחר שהזירה בטוחה ולפני ייבוש, פינוי ושיקום משמעותיים. השמאי מפריד בין נזקי שיטפון, חדירת גשם, רוח, ברד וכשל תחזוקתי ובודק את הכיסוי לפי הפוליסה.",
              related: '<a href="/natural-disasters-and-storms-in-war/">מדריך נזקי טבע וסערות</a> · <a href="/movie/weather-damage-coverage-storm-insurance-claims/">סרטון על כיסוי נזקי סערה</a> · <a href="/שמאי-רכוש-לנזקי-שיטפון/">שמאי לנזקי שיטפון</a>',
            }
      : null;
  if (!answer) return "";
  return `<section class="rr-video-summary rr-direct-answer" aria-label="${answer.label}">
    <h2>${answer.question}</h2>
    <p><strong>התשובה הקצרה:</strong> ${answer.text}</p>
    <h3>איזה תיעוד צריך להכין?</h3>
    <p>${answer.evidence}</p>
    <h3>מתי מזמינים שמאי רכוש?</h3>
    <p>${answer.timing}</p>
    <p><strong>המשך קריאה וצפייה:</strong> ${answer.related}</p>
  </section>`;
}

// WordPress migration left <br /> tags inside <style> blocks of article
// content_html. Rendered raw during SSR they break the CSS entirely, so strip
// <br> only inside <style>...</style>. Pure string transform, fail-safe.
function stripBrInStyle(html: string): string {
  try {
    return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) =>
      block.replace(/<br\s*\/?>/gi, "\n"),
    );
  } catch {
    return html;
  }
}

export function SingleTemplate({
  record,
  slug,
  related: relatedProp,
}: {
  record: SingleRecord;
  slug?: string;
  related?: RelatedHtml;
}) {
  const [fetched, setFetched] = useState<RelatedHtml>({ w1: "", w2: "" });
  const related = relatedProp ?? fetched;

  useEffect(() => {
    // When the route loader already resolved related posts server-side there is
    // nothing to fetch (and no post-hydration content swap / layout shift).
    if (relatedProp) return;
    let cancelled = false;
    if (record.type !== "post" || !slug) {
      setFetched({ w1: "", w2: "" });
      return;
    }
    loadIndex().then((idx) => {
      if (cancelled || !idx) return;
      setFetched(buildRelated(idx.posts, slug));
    });
    return () => {
      cancelled = true;
    };
  }, [record, slug, relatedProp]);

  const html = useMemo(() => {
    if (record.type === "static") {
      const base = improveMigratedHtml(
        stripBrInStyle(record.main_html ?? ""),
        record.title ?? "העמוד",
      );
      // SEO: static Elementor pages (about, team, jobs) use styled <h2>/<div>
      // headings and ship no <h1>. Guarantee exactly one keyword-bearing H1 by
      // prepending a screen-reader-only H1 from the page title when none exists.
      if (base && !/<h1[\s>]/i.test(base)) {
        const heading = (record.title ?? "")
          .replace(/<[^>]+>/g, "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .trim();
        if (heading) {
          return `<h1 class="rr-sr-only">${heading}</h1>` + base + buildSharedPipeAnswer(record) + buildServiceDirectAnswer(record, slug) + buildExpertPanel(record, slug);
        }
      }
      return base + buildSharedPipeAnswer(record) + buildServiceDirectAnswer(record, slug) + buildExpertPanel(record, slug);
    }
    const tpl = TEMPLATES[record.type];
    const rendered = tpl ? stripBrInStyle(fill(tpl, record, related.w1)) : "";
    if (record.type === "movie" || record.type === "shorts") {
      return rendered + buildMediaSummary(record);
    }
    if (record.type === "success") return rendered + buildSuccessSummary(record);
    if (record.type === "post") {
      return rendered + buildTopicHubCallout(record, slug) + buildServiceDirectAnswer(record, slug) + buildExpertPanel(record, slug);
    }
    return rendered + buildServiceDirectAnswer(record, slug) + buildExpertPanel(record, slug);
  }, [record, related.w1, slug]);

  useEffect(() => {
    const seoOverride = getSeoOverride(slug);
    if (record.type === "static") {
      document.title = seoOverride?.title ?? record.meta_title ?? record.title ?? "";
      if (record.body_class) document.body.className = record.body_class;
      else document.body.className = bodyClassFor(record.type, record.id);
    } else {
      if (seoOverride?.title ?? record.meta_title) {
        document.title = seoOverride?.title ?? record.meta_title ?? "";
      }
      document.body.className = bodyClassFor(record.type, record.id);
    }

    const description = seoOverride?.description ?? record.meta_description;
    if (description) {
      let metaEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!metaEl) {
        metaEl = document.createElement("meta");
        metaEl.name = "description";
        document.head.appendChild(metaEl);
      }
      metaEl.content = description;
    }

    let styleEl: HTMLStyleElement | null = null;
    if (record.type === "static" && record.styles_css) {
      const styleId = `page-css-${record.id}`;
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = record.styles_css;
      document.head.appendChild(styleEl);
    }

    document.querySelectorAll(".e-con.e-parent").forEach((el) => {
      el.classList.add("e-lazyloaded");
    });
    enhanceElementor(document);

    // Swap footer widget 92ba2bb "מאמרים חשובים" with related posts for post pages.
    let footerContainer: Element | null = null;
    let footerOriginal: string | null = null;
    if (record.type === "post" && related.w2) {
      footerContainer = document.querySelector(
        '[data-id="92ba2bb"] .elementor-posts-container',
      );
      if (footerContainer) {
        footerOriginal = footerContainer.innerHTML;
        footerContainer.innerHTML = related.w2;
      }
    }

    return () => {
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (footerContainer && footerOriginal !== null) {
        footerContainer.innerHTML = footerOriginal;
      }
    };
  }, [record, related]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
