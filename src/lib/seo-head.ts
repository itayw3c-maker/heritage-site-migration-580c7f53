// Build TanStack Start head() output ({meta, links, scripts}) from a bundled
// SEO record (src/generated/seo/*.json). Emits <title>, meta[description],
// canonical, robots, og:*, twitter:*, og:image + width/height, and JSON-LD
// schema. Title/description are derived from og_title / og_description so
// every route ships its own per-page copy at SSR time.

export interface SeoRecord {
  canonical?: string;
  robots?: Record<string, string>;
  og?: Record<string, string>;
  og_image?: { url?: string; width?: number; height?: number } | null;
  twitter?: {
    twitter_card?: string;
    twitter_image?: string;
    twitter_misc?: Record<string, string>;
  };
  // schema is stored as a pre-serialized JSON string for wire-safety.
  schema?: string | null;
}

export interface HeadFragment {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<Record<string, string>>;
}

export function buildSeoHead(rec: SeoRecord | null | undefined): HeadFragment {
  const meta: HeadFragment["meta"] = [];
  const links: HeadFragment["links"] = [];
  const scripts: HeadFragment["scripts"] = [];
  if (!rec) return { meta, links, scripts };

  // title + description (SSR per-route; overrides root defaults by
  // TanStack's meta merge on name/property).
  const title = rec.og?.og_title;
  const description = rec.og?.og_description;
  if (title) meta.push({ title });
  if (description) meta.push({ name: "description", content: description });

  // robots
  if (rec.robots) {
    const parts: string[] = [];
    if (rec.robots["index"]) parts.push(rec.robots["index"]);
    if (rec.robots["follow"]) parts.push(rec.robots["follow"]);
    for (const [k, v] of Object.entries(rec.robots)) {
      if (k === "index" || k === "follow") continue;
      if (typeof v === "string" && v) parts.push(v);
    }
    if (parts.length) meta.push({ name: "robots", content: parts.join(", ") });
  }

  // og:*
  if (rec.og) {
    for (const [k, v] of Object.entries(rec.og)) {
      if (!v) continue;
      const prop = k.replace(/_/g, ":");
      // og:image handled separately below
      if (prop === "og:image") continue;
      meta.push({ property: prop, content: String(v) });
    }
  }

  // og:image
  if (rec.og_image?.url) {
    meta.push({ property: "og:image", content: rec.og_image.url });
    if (rec.og_image.width)
      meta.push({ property: "og:image:width", content: String(rec.og_image.width) });
    if (rec.og_image.height)
      meta.push({ property: "og:image:height", content: String(rec.og_image.height) });
  }

  // twitter
  if (rec.twitter?.twitter_card) {
    meta.push({ name: "twitter:card", content: rec.twitter.twitter_card });
  }
  // Fall back to the page's own og:image so Twitter/X cards use the local
  // per-page image instead of the root default (which was a stale
  // Lovable-preview URL). Every page ships a local og:image.
  const twitterImage = rec.twitter?.twitter_image || rec.og_image?.url;
  if (twitterImage) {
    meta.push({ name: "twitter:image", content: twitterImage });
  }
  if (rec.twitter?.twitter_misc) {
    const labels = Object.keys(rec.twitter.twitter_misc);
    labels.forEach((label, i) => {
      meta.push({ name: `twitter:label${i + 1}`, content: label });
      meta.push({ name: `twitter:data${i + 1}`, content: rec.twitter!.twitter_misc![label] });
    });
  }

  if (rec.canonical) {
    links.push({ rel: "canonical", href: rec.canonical });
  }

  if (rec.schema) {
    scripts.push({
      type: "application/ld+json",
      children: rec.schema,
    });
  }

  return { meta, links, scripts };
}

export function augmentHomepagePrivateSeo(rec: SeoRecord | null): SeoRecord | null {
  const reviewed = augmentExpertSeo(rec, { reviewed: true, path: "" });
  if (!reviewed?.schema) return reviewed;
  try {
    const schema = JSON.parse(reviewed.schema) as { "@graph"?: Array<Record<string, unknown>> };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    const webPage = graph.find((item) => {
      const type = item["@type"];
      return type === "WebPage" || (Array.isArray(type) && type.includes("WebPage"));
    });
    if (webPage) {
      webPage.relatedLink = [
        "https://www.rrshamaut.co.il/private-appraiser/",
        "https://www.rrshamaut.co.il/public-vs-company-adjuster/",
        "https://www.rrshamaut.co.il/ייעוץ-וליווי-תביעות-ביטוח/",
      ];
    }
    if (!graph.some((item) => item["@type"] === "Service" && item.url === "https://www.rrshamaut.co.il/")) {
      graph.push({
        "@type": "Service",
        "@id": "https://www.rrshamaut.co.il/#/schema/property-damage-service",
        name: "שמאות רכוש והערכת נזקים",
        description:
          "בדיקה, תיעוד וכימות של נזקי רכוש למבנה, לתכולה ולמערכות והכנת חוות דעת מקצועית לתביעות ביטוח ולדרישות פיצוי.",
        serviceType: "הערכת נזקי רכוש",
        url: "https://www.rrshamaut.co.il/",
        provider: { "@id": "https://www.rrshamaut.co.il/#organization" },
        areaServed: { "@type": "Country", name: "ישראל" },
        mainEntityOfPage: { "@id": "https://www.rrshamaut.co.il/" },
      });
    }
    let faqPage = graph.find((item) => item["@type"] === "FAQPage");
    if (!faqPage) {
      faqPage = {
        "@type": "FAQPage",
        "@id": "https://www.rrshamaut.co.il/#/schema/faq",
        mainEntity: [],
      };
      graph.push(faqPage);
    }
    const entities = Array.isArray(faqPage.mainEntity)
      ? (faqPage.mainEntity as Array<Record<string, unknown>>)
      : [];
    const question = "מתי צריך שמאי פרטי ומה ההבדל בינו לבין שמאי חברת הביטוח?";
    if (!entities.some((entity) => entity.name === question)) {
      entities.unshift({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: "שמאי פרטי מתאים כאשר נדרש תיעוד עצמאי של נזק, הערכת עלויות או חוות דעת מטעם בעל הנכס או המבוטח, במיוחד לפני תיקון משמעותי או כשקיימת מחלוקת על היקף הנזק. שמאי חברת הביטוח פועל במסגרת המינוי שקיבל ממנה, בעוד השמאי הפרטי נשכר בידי הלקוח. ההכרעה והכיסוי נקבעים לפי הראיות, הפוליסה והנסיבות.",
        },
      });
      faqPage.mainEntity = entities;
    }
    const damageQuestion = "מה עושה שמאי נזקים?";
    if (!entities.some((entity) => entity.name === damageQuestion)) {
      entities.unshift({
        "@type": "Question",
        name: damageQuestion,
        acceptedAnswer: {
          "@type": "Answer",
          text: "שמאי נזקים בודק את מקור האירוע והיקפו, מפריד בין נזקי מבנה, תכולה ומערכות, מתעד ממצאים, בוחן מסמכים והצעות מחיר ומעריך את עלות השבת המצב לקדמותו. חוות הדעת יכולה לשמש בתביעת ביטוח, בדרישת פיצוי או במחלוקת על היקף הנזק.",
        },
      });
      faqPage.mainEntity = entities;
    }
    return { ...reviewed, schema: JSON.stringify(schema) };
  } catch {
    return reviewed;
  }
}

export function seoFileKey(path: string): string {
  const key = (path || "").replace(/^\/+|\/+$/g, "");
  return key ? encodeURIComponent(key) : "__home__";
}

export function overrideSeoIdentity(
  rec: SeoRecord | null,
  overrides: { canonical?: string; title?: string; description?: string },
): SeoRecord | null {
  if (!rec) return rec;
  const next: SeoRecord = {
    ...rec,
    canonical: overrides.canonical ?? rec.canonical,
    og: rec.og ? { ...rec.og } : rec.og,
  };
  if (next.og && overrides.title) next.og.og_title = overrides.title;
  if (next.og && overrides.description) next.og.og_description = overrides.description;
  if (next.og && overrides.canonical) next.og.og_url = overrides.canonical;
  if (!rec.schema) return next;
  try {
    let serialized = rec.schema;
    if (overrides.canonical && rec.canonical) {
      serialized = serialized.split(rec.canonical).join(overrides.canonical);
    }
    const schema = JSON.parse(serialized) as { "@graph"?: unknown[] };
    if ((overrides.title || overrides.description) && Array.isArray(schema["@graph"])) {
      for (const item of schema["@graph"]) {
        if ((item as { "@type"?: unknown })?.["@type"] === "WebPage") {
          if (overrides.title) (item as { name?: string }).name = overrides.title;
          if (overrides.description) {
            (item as { description?: string }).description = overrides.description;
          }
        }
      }
    }
    next.schema = JSON.stringify(schema);
  } catch {
    // Keep the original schema if an imported record is malformed.
  }
  return next;
}

export function augmentVideoSeo(
  rec: SeoRecord | null,
  record: { title?: string; meta_description?: string; video_settings?: string },
): SeoRecord | null {
  if (!rec?.schema || !record.video_settings) return rec;
  try {
    const settings = JSON.parse(record.video_settings) as { youtube_url?: string };
    const youtubeUrl = settings.youtube_url ?? "";
    const id = youtubeUrl.match(/(?:shorts\/|youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{6,})/)?.[1];
    if (!id) return rec;
    const schema = JSON.parse(rec.schema) as { "@graph"?: unknown[] };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    if (graph.some((item) => (item as { "@type"?: unknown })?.["@type"] === "VideoObject")) {
      return rec;
    }
    const page = graph.find((item) => (item as { "@type"?: unknown })?.["@type"] === "WebPage") as
      | { "@id"?: string; datePublished?: string; dateModified?: string }
      | undefined;
    const topic = `${record.title ?? ""} ${record.meta_description ?? ""}`;
    const keywords = /שריפ|אש|פיח/.test(topic)
      ? ["נזקי אש", "נזקי שריפה", "פיח", "שמאות רכוש", "תביעת ביטוח"]
      : /סער|שיטפו|גשם|מזג אוויר|ברד/.test(topic)
        ? ["נזקי טבע", "סערה", "שיטפון", "שמאות רכוש", "ביטוח דירה"]
        : /מים|רטיב|נזיל|צנרת|לחות|קפילר|הצפ/.test(topic)
          ? ["נזקי מים", "רטיבות", "צנרת", "שמאות רכוש", "תביעת ביטוח"]
          : ["שמאות רכוש", "הערכת נזקים", "תביעת ביטוח"];
    const thumbnailVariant = id === "asntYYdHl_U" ? "hqdefault" : "maxresdefault";
    graph.unshift({
      "@type": "VideoObject",
      "@id": `${rec.canonical ?? page?.["@id"] ?? ""}#video`,
      name: record.title || rec.og?.og_title,
      description: record.meta_description || rec.og?.og_description,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/${thumbnailVariant}.jpg`,
      uploadDate: page?.datePublished,
      dateModified: page?.dateModified,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      contentUrl: `https://www.youtube.com/watch?v=${id}`,
      inLanguage: "he-IL",
      isFamilyFriendly: true,
      keywords,
      creator: { "@id": "https://www.rrshamaut.co.il/#/schema/person/fe58479381961be2031bd74a5eec70d7" },
      publisher: { "@id": "https://www.rrshamaut.co.il/#organization" },
      mainEntityOfPage: { "@id": rec.canonical ?? page?.["@id"] },
      potentialAction: {
        "@type": "WatchAction",
        target: `https://www.youtube.com/watch?v=${id}`,
      },
    });
    return { ...rec, schema: JSON.stringify(schema) };
  } catch {
    return rec;
  }
}

export function augmentShortSeo(
  rec: SeoRecord | null,
  record: { title?: string; meta_description?: string; content_html?: string },
): SeoRecord | null {
  if (!rec?.schema) return rec;
  try {
    const schema = JSON.parse(rec.schema) as { "@graph"?: unknown[] };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    if (graph.some((item) => (item as { "@type"?: unknown })?.["@type"] === "Article")) {
      return rec;
    }
    const page = graph.find((item) => (item as { "@type"?: unknown })?.["@type"] === "WebPage") as
      | { "@id"?: string; datePublished?: string; dateModified?: string }
      | undefined;
    const text = `${record.content_html ?? ""} ${record.meta_description ?? ""}`
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const topic = `${record.title ?? ""} ${record.meta_description ?? ""} ${text}`;
    const about = /שריפ|אש|פיח/.test(topic)
      ? ["נזקי אש", "ביטוח דירה", "שמאות רכוש"]
      : /סער|שיטפו|גשם|מזג אוויר|ברד|רעידת אדמה/.test(topic)
        ? ["נזקי טבע", "ביטוח רכוש", "שמאות רכוש"]
        : /מים|רטיב|נזיל|צנרת|לחות|קפילר|הצפ/.test(topic)
          ? ["נזקי מים", "צנרת ורטיבות", "שמאות רכוש"]
          : ["שמאות רכוש", "תביעות ביטוח", "הערכת נזקים"];
    graph.unshift({
      "@type": "Article",
      "@id": `${rec.canonical ?? page?.["@id"] ?? ""}#article`,
      headline: record.title || rec.og?.og_title,
      description: record.meta_description || rec.og?.og_description,
      abstract: record.meta_description || rec.og?.og_description,
      articleBody: text || undefined,
      datePublished: page?.datePublished,
      dateModified: page?.dateModified,
      inLanguage: "he-IL",
      wordCount: text ? text.split(/\s+/).length : undefined,
      about,
      keywords: about,
      isAccessibleForFree: true,
      author: { "@id": "https://www.rrshamaut.co.il/#organization" },
      publisher: { "@id": "https://www.rrshamaut.co.il/#organization" },
      mainEntityOfPage: { "@id": rec.canonical ?? page?.["@id"] },
    });
    return { ...rec, schema: JSON.stringify(schema) };
  } catch {
    return rec;
  }
}

export function augmentSuccessSeo(
  rec: SeoRecord | null,
  record: {
    title?: string;
    meta_description?: string;
    content_html?: string;
    featured_image_url?: string;
  },
): SeoRecord | null {
  const seeded = rec && !rec.schema
    ? {
        ...rec,
        schema: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [{
            "@type": "WebPage",
            "@id": rec.canonical,
            url: rec.canonical,
            name: record.title || rec.og?.og_title,
            description: record.meta_description || rec.og?.og_description,
            inLanguage: "he-IL",
            isPartOf: { "@id": "https://www.rrshamaut.co.il/#website" },
          }],
        }),
      }
    : rec;
  const augmented = augmentShortSeo(seeded, record);
  if (!augmented?.schema) return augmented;
  try {
    const schema = JSON.parse(augmented.schema) as { "@graph"?: unknown[] };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    const article = graph.find((item) => {
      const type = (item as { "@type"?: unknown })?.["@type"];
      return type === "Article" || type === "BlogPosting" ||
        (Array.isArray(type) && type.some((value) => value === "Article" || value === "BlogPosting"));
    }) as
      | {
          articleSection?: string;
          image?: { "@type": string; url: string };
          abstract?: string;
          articleBody?: string;
          wordCount?: number;
          about?: string[];
          keywords?: string[];
          isAccessibleForFree?: boolean;
        }
      | undefined;
    if (!article) return augmented;
    article.articleSection = "סיפורי הצלחה בתביעות ביטוח ושמאות רכוש";
    const contentText = (record.content_html ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const disclaimer =
      "התוצאה מתייחסת למקרה המסוים ולנסיבותיו. גובה הפיצוי והטיפול בכל תביעה נקבעים לפי היקף הנזק, תנאי הפוליסה, התיעוד והבדיקה המקצועית.";
    const articleBody = [contentText, record.meta_description, disclaimer].filter(Boolean).join(" ");
    const topic = `${record.title ?? ""} ${record.meta_description ?? ""} ${contentText}`;
    const about = /שריפ|אש|פיח/.test(topic)
      ? ["נזקי אש", "תביעת ביטוח", "שמאות רכוש"]
      : /מים|רטיב|נזיל|צנרת|לחות|קפילר|הצפ/.test(topic)
        ? ["נזקי מים", "תביעת ביטוח", "שמאות רכוש"]
        : ["נזקי רכוש", "תביעת ביטוח", "שמאות רכוש"];
    article.abstract = record.meta_description;
    article.articleBody = articleBody;
    article.wordCount = articleBody ? articleBody.split(/\s+/).length : undefined;
    article.about = about;
    article.keywords = about;
    article.isAccessibleForFree = true;
    const contentImage = record.content_html?.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
    const imageUrl = record.featured_image_url || contentImage;
    if (imageUrl) {
      const absoluteImageUrl = imageUrl.startsWith("/")
        ? `https://www.rrshamaut.co.il${imageUrl}`
        : imageUrl;
      article.image = { "@type": "ImageObject", url: absoluteImageUrl };
    }
    return { ...augmented, schema: JSON.stringify(schema) };
  } catch {
    return augmented;
  }
}

export function correctArticleWordCount(
  rec: SeoRecord | null,
  record: { content_html?: string },
): SeoRecord | null {
  if (!rec?.schema || !record.content_html) return rec;
  try {
    const schema = JSON.parse(rec.schema) as { "@graph"?: unknown[] };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    const article = graph.find((item) => {
      const type = (item as { "@type"?: unknown })?.["@type"];
      return type === "Article" || type === "BlogPosting" ||
        (Array.isArray(type) && type.some((value) => value === "Article" || value === "BlogPosting"));
    }) as { wordCount?: number } | undefined;
    if (!article) return rec;
    const text = record.content_html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    if (wordCount > 0) article.wordCount = wordCount;
    return { ...rec, schema: JSON.stringify(schema) };
  } catch {
    return rec;
  }
}

const RAFAEL_PERSON_ID = "https://www.rrshamaut.co.il/#/schema/person/fe58479381961be2031bd74a5eec70d7";
const RAFAEL_PROFILE_URL =
  "https://www.rrshamaut.co.il/about/השמאי-רפאל-ריבוח-מייסד-ובעלים/";
const EXPERT_REVIEW_DATE = "2026-08-17";

export function augmentExpertSeo(
  rec: SeoRecord | null,
  options: { reviewed?: boolean; path?: string } = {},
): SeoRecord | null {
  if (!rec?.schema) return rec;
  try {
    const schema = JSON.parse(rec.schema) as { "@graph"?: Array<Record<string, unknown>> };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    let person = graph.find((item) => {
      const type = item["@type"];
      return type === "Person" && (item.name === "רפאל ריבוח" || item["@id"] === RAFAEL_PERSON_ID);
    });
    if (!person) {
      person = { "@type": "Person", "@id": RAFAEL_PERSON_ID, name: "רפאל ריבוח" };
      graph.push(person);
    }
    person["@id"] = RAFAEL_PERSON_ID;
    person.name = "רפאל ריבוח";
    person.url = RAFAEL_PROFILE_URL;
    person.jobTitle = "שמאי רכוש וסוקר סיכונים";
    person.description =
      "שמאי רכוש, סוקר סיכונים ומאתר ליקויי בנייה מורשה, המתמחה בהערכת נזקי מים, אש ורכוש ובליווי תביעות ביטוח.";
    person.image = {
      "@type": "ImageObject",
      url: "https://www.rrshamaut.co.il/wp-content/uploads/2024/08/רפאל-שמאות-רכוש.webp",
    };
    person.worksFor = { "@id": "https://www.rrshamaut.co.il/#organization" };
    person.knowsAbout = [
      "שמאות רכוש",
      "הערכת נזקי מים ורטיבות",
      "הערכת נזקי אש ופיח",
      "ליווי תביעות ביטוח",
      "סקרי סיכונים",
      "איתור ליקויי בנייה",
    ];
    person.sameAs = [
      RAFAEL_PROFILE_URL,
      "https://www.facebook.com/rrshamaut/",
      "https://www.instagram.com/rrshamaut/",
      "https://www.youtube.com/@rephael.shamaut-rr",
      "https://www.tiktok.com/@rephaelshamaut",
    ];

    for (const item of graph) {
      const type = item["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (types.includes("Organization")) item.founder = { "@id": RAFAEL_PERSON_ID };
      if (types.includes("Article") || types.includes("BlogPosting")) {
        item.author = { "@id": RAFAEL_PERSON_ID };
      }
      if (
        options.reviewed &&
        (types.includes("Article") || types.includes("BlogPosting") || types.includes("WebPage"))
      ) {
        item.reviewedBy = { "@id": RAFAEL_PERSON_ID };
        item.lastReviewed = EXPERT_REVIEW_DATE;
        item.dateModified = EXPERT_REVIEW_DATE;
        item.citation = [
          "https://haotzarsheli.mof.gov.il/Subject/Pages/Choosing-Apartment-Insurance.aspx",
          "https://www.gov.il/BlobFolder/dynamiccollectorresultitem/notice-2022-9-2/he/claim-solution-2022-9-2-pdf.pdf",
        ];
      }
      if (options.reviewed && types.includes("VideoObject")) {
        item.creator = { "@id": RAFAEL_PERSON_ID };
        item.reviewedBy = { "@id": RAFAEL_PERSON_ID };
        item.dateModified = EXPERT_REVIEW_DATE;
      }
    }
    const normalizedPath = options.path?.replace(/^\/+|\/+$/g, "");
    if (
      normalizedPath === "movie/underfloor-drying-pros-cons" &&
      !graph.some((item) => item["@type"] === "VideoObject")
    ) {
      const pageUrl = "https://www.rrshamaut.co.il/movie/underfloor-drying-pros-cons/";
      const videoId = "M4FWMcK6tio";
      graph.unshift({
        "@type": "VideoObject",
        "@id": `${pageUrl}#video`,
        name: "ייבוש תת רצפתי – יתרונות וחסרונות שחשוב להכיר",
        description:
          "הסבר מקצועי על התאמה, מדידות, יתרונות, מגבלות ובקרה בתהליך ייבוש תת רצפתי לאחר נזקי מים.",
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
        inLanguage: "he-IL",
        isFamilyFriendly: true,
        creator: { "@id": RAFAEL_PERSON_ID },
        publisher: { "@id": "https://www.rrshamaut.co.il/#organization" },
        mainEntityOfPage: { "@id": pageUrl },
        potentialAction: {
          "@type": "WatchAction",
          target: `https://www.youtube.com/watch?v=${videoId}`,
        },
      });
    }
    if (normalizedPath === "נזקי-מים-הצפה-ורטיבות") {
      const pageUrl = "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/";
      if (!graph.some((item) => item["@type"] === "Service" && item.url === pageUrl)) {
        graph.push({
          "@type": "Service",
          "@id": `${pageUrl}#/schema/service`,
          name: "שמאות נזקי מים, הצפה ורטיבות",
          description:
            "תיעוד והערכת נזקי מים למבנה ולתכולה, כימות עלויות ייבוש ושיקום והכנת חוות דעת לתביעת ביטוח.",
          serviceType: "שמאות רכוש לנזקי מים",
          url: pageUrl,
          provider: { "@id": "https://www.rrshamaut.co.il/#organization" },
          areaServed: { "@type": "Country", name: "ישראל" },
          mainEntityOfPage: { "@id": pageUrl },
        });
      }
    }
    if (normalizedPath === "שמאי-רכוש-בצפון-כל-מה-שצריך-לדעת-על-נזק") {
      const pageUrl = "https://www.rrshamaut.co.il/שמאי-רכוש-בצפון-כל-מה-שצריך-לדעת-על-נזק/";
      if (!graph.some((item) => item["@type"] === "Service" && item.url === pageUrl)) {
        graph.push({
          "@type": "Service",
          "@id": `${pageUrl}#/schema/service`,
          name: "שמאות רכוש בצפון",
          description:
            "בדיקה, תיעוד וכימות של נזקי מים, אש ורכוש למבנה, לתכולה ולמערכות בצפון הארץ.",
          serviceType: "שמאות רכוש והערכת נזקים",
          url: pageUrl,
          provider: { "@id": "https://www.rrshamaut.co.il/#organization" },
          areaServed: { "@type": "AdministrativeArea", name: "צפון ישראל" },
          availableChannel: {
            "@type": "ServiceChannel",
            serviceLocation: {
              "@type": "Place",
              name: "רפאל שמאות רכוש — סניף צפון",
              address: {
                "@type": "PostalAddress",
                streetAddress: "השושנים 1",
                addressLocality: "פוריה–נווה עובד",
                addressCountry: "IL",
              },
            },
          },
          mainEntityOfPage: { "@id": pageUrl },
        });
      }
    }
    const relatedLinks: Record<string, string[]> = {
      "שמאי-רכוש-בצפון-כל-מה-שצריך-לדעת-על-נזק": [
        "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/",
        "https://www.rrshamaut.co.il/נזקי-אש-ופיח/",
        "https://www.rrshamaut.co.il/ייעוץ-וליווי-תביעות-ביטוח/",
      ],
      "הבדל-בין-שמאי-רכוש-פרטי-לשמאי-רכוש-מטעם": [
        "https://www.rrshamaut.co.il/private-appraiser/",
        "https://www.rrshamaut.co.il/public-vs-company-adjuster/",
        "https://www.rrshamaut.co.il/ייעוץ-וליווי-תביעות-ביטוח/",
      ],
      "שמאי-נזקי-בניה-כל-מה-שצריך-לדעת": [
        "https://www.rrshamaut.co.il/structural-vs-contents-damage/",
        "https://www.rrshamaut.co.il/damage-assessments-loss-adjusting/",
        "https://www.rrshamaut.co.il/ייעוץ-וליווי-תביעות-ביטוח/",
      ],
      "שמאי-נזקי-פריצה": [
        "https://www.rrshamaut.co.il/כל-מה-שחשוב-לדעת-על-נזקי-פריצה-מדריך-מק/",
        "https://www.rrshamaut.co.il/business-burglary-claim/",
        "https://www.rrshamaut.co.il/ייעוץ-וליווי-תביעות-ביטוח/",
      ],
      "הסבר-על-הליך-תביעת-ביטוח-בנזקי-מים-שלב": [
        "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/",
        "https://www.rrshamaut.co.il/תביעת-ביטוח-נזקי-צנרת-מדריך-מקיף-לתהלי/",
        "https://www.rrshamaut.co.il/נזילה-מהשכן-מלמעלה/",
      ],
      "שמאי-נזקי-רכוש": [
        "https://www.rrshamaut.co.il/חווד-קבילה-משפטית/",
        "https://www.rrshamaut.co.il/כל-מה-שחשוב-לדעת-על-דוח-שמאות-רכוש/",
        "https://www.rrshamaut.co.il/damage-assessments-loss-adjusting/",
      ],
      "הערכת-שווי-רכוש": [
        "https://www.rrshamaut.co.il/הערכת-שמאות-לריהוט-עתיק/",
        "https://www.rrshamaut.co.il/שמאות-רכוש-לפריטי-אומנות-והערכות-שווי/",
        "https://www.rrshamaut.co.il/שמאי-נזקי-רכוש/",
      ],
      "הערכת-שמאות-לריהוט-עתיק": [
        "https://www.rrshamaut.co.il/הערכת-שווי-רכוש/",
        "https://www.rrshamaut.co.il/שמאות-רכוש-לפריטי-אומנות-והערכות-שווי/",
        "https://www.rrshamaut.co.il/חווד-קבילה-משפטית/",
      ],
      "damage-to-electrical-systems": [
        "https://www.rrshamaut.co.il/burnt-air-conditioner/",
        "https://www.rrshamaut.co.il/structural-vs-contents-damage/",
        "https://www.rrshamaut.co.il/ייעוץ-וליווי-תביעות-ביטוח/",
      ],
      "תביעת-ביטוח-נזקי-צנרת-מדריך-מקיף-לתהלי": [
        "https://www.rrshamaut.co.il/שמאי-נזקי-צנרת/",
        "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/",
        "https://www.rrshamaut.co.il/movie/documenting-plumbing-damage-from-day-one/",
      ],
      "נזק-מים-במעלית": [
        "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/",
        "https://www.rrshamaut.co.il/structural-vs-contents-damage/",
        "https://www.rrshamaut.co.il/תביעת-ביטוח-נזקי-צנרת-מדריך-מקיף-לתהלי/",
      ],
      "movie/underfloor-drying-pros-cons": [
        "https://www.rrshamaut.co.il/movie/moisture-test-standard-insurance-responsibility/",
        "https://www.rrshamaut.co.il/movie/insurance-must-perform-underfloor-drying/",
        "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/",
      ],
      "נזקי-מים-מהשכן-רטיבות-בתקרה-מדריך-מקיף": [
        "https://www.rrshamaut.co.il/נזילה-מהשכן-מלמעלה/",
        "https://www.rrshamaut.co.il/נזילה-מהשכן-מעליי-מה-לעשות-כששכן-מסרב-ל/",
        "https://www.rrshamaut.co.il/shorts/water-damage-from-upstairs-neighbor-persistent-moisture/",
      ],
      "שמאי-נזקי-מים-המדריך-המלא": [
        "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/",
        "https://www.rrshamaut.co.il/movie/mapping-moisture-after-plumbing-damage/",
        "https://www.rrshamaut.co.il/success/62000-nis-compensation-water-damage-claim/",
      ],
      "נזקי-מים-הצפה-ורטיבות": [
        "https://www.rrshamaut.co.il/נזקי-מים-עליה-קפילארית-כיצד-לפעול/",
        "https://www.rrshamaut.co.il/movie/mapping-moisture-after-plumbing-damage/",
        "https://www.rrshamaut.co.il/success/62000-nis-compensation-water-damage-claim/",
      ],
      "נזקי-אש-ופיח": [
        "https://www.rrshamaut.co.il/איך-שמאי-נזקי-אש-יכול-למקסם-את-הפיצויים/",
        "https://www.rrshamaut.co.il/movie/fire-damage-no-building-insurance-cost/",
        "https://www.rrshamaut.co.il/success/תשלום-בגין-נזקי-שריפה-ע״ס-125000/",
      ],
      "earthquake-damage-compensation": [
        "https://www.rrshamaut.co.il/נזקי-טבע-שיטפונות-וסערה/",
        "https://www.rrshamaut.co.il/shorts/earthquake-damage-insurance-coverage/",
        "https://www.rrshamaut.co.il/structural-vs-contents-damage/",
      ],
      "שמאי-נזקי-שריפה-מה-נכון-לעשות-כאשר-נגרם": [
        "https://www.rrshamaut.co.il/נזקי-אש-ופיח/",
        "https://www.rrshamaut.co.il/movie/fire-damage-no-building-insurance-cost/",
        "https://www.rrshamaut.co.il/success/תשלום-בגין-נזקי-שריפה-ע״ס-125000/",
      ],
      "שמאי-נזק-שער-חשמלי": [
        "https://www.rrshamaut.co.il/שמאי-נזקי-התנגשות/",
        "https://www.rrshamaut.co.il/ייעוץ-וליווי-תביעות-ביטוח/",
        "https://www.rrshamaut.co.il/damage-assessments-loss-adjusting/",
      ],
      "שמאי-נזקי-הצפה-כל-מה-שצריך-לדעת-שמאי-רכו": [
        "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/",
        "https://www.rrshamaut.co.il/flood-damage-to-property/",
        "https://www.rrshamaut.co.il/success/מהצפה-בבית-לפיצוי-של-למעלה-מ־100000-₪/",
      ],
      "נזקי-שוכרים": [
        "https://www.rrshamaut.co.il/שמאות-נזקי-שוכרים-ההבדל-בין-בלאי-טבעי-ל/",
        "https://www.rrshamaut.co.il/damage-caused-by-a-tenant-to-the-property/",
        "https://www.rrshamaut.co.il/תביעת-נזקי-שוכרים/",
      ],
      "שמאי-נזקי-התנגשות": [
        "https://www.rrshamaut.co.il/שמאי-נזק-שער-חשמלי/",
        "https://www.rrshamaut.co.il/נזקי-התנגשות-כלי-רכב-ברכוש-כיצד-להעריך/",
        "https://www.rrshamaut.co.il/movie/סרטון-בנושא-נזקי-התנגשות-ברכוש-איך-מתמ/",
      ],
      "שמאי-רכוש-בנזקי-מלחמה": [
        "https://www.gov.il/he/service/online-direct-damage-claim",
        "https://www.rrshamaut.co.il/שמאי-מס-רכוש-נזקי-מלחמה/",
        "https://www.rrshamaut.co.il/נזקי-רכוש-במלחמה-כיצד-להעריך-לשקם-ולהת/",
      ],
      "נזקי-מים-עליה-קפילארית-כיצד-לפעול": [
        "https://www.rrshamaut.co.il/נזקי-מים-הצפה-ורטיבות/",
        "https://www.rrshamaut.co.il/movie/capillary-moisture-after-plumbing-damage/",
        "https://www.rrshamaut.co.il/shorts/video-moisture-content-test-standards-institute-capillary-rise/",
      ],
      "נזקי-טבע-שיטפונות-וסערה": [
        "https://www.rrshamaut.co.il/natural-disasters-and-storms-in-war/",
        "https://www.rrshamaut.co.il/movie/weather-damage-coverage-storm-insurance-claims/",
        "https://www.rrshamaut.co.il/שמאי-רכוש-לנזקי-שיטפון/",
      ],
    };
    if (normalizedPath && relatedLinks[normalizedPath]) {
      const webPage = graph.find((item) => {
        const type = item["@type"];
        return type === "WebPage" || (Array.isArray(type) && type.includes("WebPage"));
      });
      if (webPage) webPage.relatedLink = relatedLinks[normalizedPath];
    }
    if (normalizedPath === "שאלות-תשובות") {
      const faqPage = graph.find((item) => item["@type"] === "FAQPage");
      if (faqPage) {
        const entities = Array.isArray(faqPage.mainEntity)
          ? (faqPage.mainEntity as Array<Record<string, unknown>>)
          : [];
        const question = "מי אחראי לנזק בצנרת משותפת בבניין?";
        if (!entities.some((entity) => entity.name === question)) {
          entities.unshift({
            "@type": "Question",
            name: question,
            acceptedAnswer: {
              "@type": "Answer",
              text: "האחריות נקבעת לפי מיקום הצינור, את מי הוא משרת ומה גרם לנזק. צנרת המשרתת את כלל בעלי הדירות או חלקם עשויה להיחשב רכוש משותף, בעוד צינור המשרת דירה אחת בלבד יהיה בדרך כלל באחריות בעל הדירה. יש לבדוק את תשריט הצנרת, התקנון, ממצאי האיתור ותנאי הפוליסה לפני קביעת האחריות והכיסוי.",
            },
          });
          faqPage.mainEntity = entities;
        }
      }
    }
    const serviceFaq = normalizedPath === "damage-to-electrical-systems"
      ? {
          question: "מי בודק נזקי חשמל ומה כוללת חוות הדעת השמאית?",
          answer: "חשמלאי מוסמך או מהנדס חשמל בודק בטיחות, מקור כשל ותקינות; שמאי רכוש מתעד ומכמת נזק ללוחות, חיווט, מערכות, מכשירים וציוד ומעריך תיקון או החלפה. במקרה של סכנת התחשמלות אין לגעת בציוד. חוות הדעת אינה מחליפה אישור בטיחות ואינה מבטיחה כיסוי או פיצוי.",
        }
      : normalizedPath === "תביעת-ביטוח-נזקי-צנרת-מדריך-מקיף-לתהלי"
        ? {
            question: "מה עושים בתביעת ביטוח נזקי צנרת ומה צריך לתעד?",
            answer: "עוצרים סכנה והחמרה, מתעדים את מקור המים ואת נזקי המבנה והתכולה, מדווחים למבטח ושומרים דוח איתור, תמונות, מדידות, חשבוניות והצעות מחיר לפני שיקום נרחב. תיקון הצינור אינו מודד לבדו רטיבות כלואה או את מלוא הנזק; הכיסוי והתשלום תלויים בפוליסה ובראיות ואינם מובטחים.",
          }
      : normalizedPath === "נזק-מים-במעלית"
        ? {
            question: "מה עושים מיד כשמים חודרים למעלית?",
            answer: "מונעים שימוש במעלית, מרחיקים אנשים ומודיעים לנציגות הבניין ולחברת שירות המעליות. אין להיכנס לבור, לחדר מכונות או לאזור חשמלי ואין להפעיל את המעלית מחדש. טכנאי או בודק מוסמך קובע בטיחות ותקינות; לאחר שהזירה בטוחה שמאי רכוש מתעד ומכמת את הנזק. הכיסוי תלוי במקור, בבעלות ובפוליסות ואינו מובטח.",
          }
      : normalizedPath === "movie/underfloor-drying-pros-cons"
        ? {
            question: "מתי נדרש ייבוש תת רצפתי ומה היתרונות והחסרונות?",
            answer: "ייבוש תת רצפתי נשקל לאחר עצירת מקור המים וכאשר מדידות מצביעות על לחות כלואה מתחת לריצוף. הוא עשוי לצמצם פירוק, אך דורש נקודות גישה, זמן, רעש ובקרה ואינו מתאים לכל תשתית או נזק. קבלן ייבוש מתכנן ומבצע, גורם בדיקה מודד ושמאי רכוש מתעד חלופות ועלויות. הכיסוי תלוי בפוליסה ובראיות ואינו מובטח.",
          }
      : normalizedPath === "נזקי-מים-מהשכן-רטיבות-בתקרה-מדריך-מקיף"
        ? {
            question: "מה עושים כשיש רטיבות בתקרה מהשכן?",
            answer: "מתעדים את הרטיבות, מודיעים לשכן ולמבטחת ומאתרים את מקור המים לפני צביעה או שיקום. סימן בתקרה אינו מוכיח לבדו אם המקור הוא צנרת פרטית, איטום או מערכת משותפת. שומרים דוח איתור, מדידות, תמונות, התכתבויות והוצאות; שמאי רצוי להזמין לפני שינוי משמעותי. האחריות, הכיסוי והפיצוי תלויים במקור, בראיות, בדין ובפוליסות ואינם מובטחים.",
          }
      : normalizedPath === "הערכת-שמאות-לריהוט-עתיק"
      ? {
          question: "איך שמאי מעריך ריהוט עתיק ומה צריך להכין?",
          answer: "השמאי בוחן יצרן או סדנה, תקופה משוערת, חומרים, מידות, טכניקה, סימונים, מצב, תיקונים, נדירות ומקור מתועד ומשווה למקורות שוק רלוונטיים. מכינים צילומים, מידות, סימנים ומסמכי בעלות. ההערכה אינה בהכרח אימות אותנטיות ואינה מבטיחה מחיר מכירה או קבלה משפטית.",
        }
      : normalizedPath === "הערכת-שווי-רכוש"
      ? {
          question: "איך מבצעים הערכת שווי רכוש ומה כוללת הבדיקה?",
          answer: "מגדירים את מטרת השומה ואת המועד הקובע, מזהים ומתארים את הפריטים ובוחנים יצרן, דגם, גיל, מצב, נדירות ושימוש. השמאי בוחר בסיס שווי מתאים ומבסס אותו באמצעות מסמכים ונתוני שוק. שווי שוק, עלות החלפה ושווי במצב קיים שונים זה מזה, וההערכה אינה מבטיחה כיסוי או מחיר מכירה.",
        }
      : normalizedPath === "שמאי-נזקי-רכוש"
      ? {
          question: "מה כוללת חוות דעת שמאי רכוש?",
          answer: "חוות דעת שמאי רכוש מתארת את האירוע והממצאים, מפרטת נזקי מבנה, תכולה ומערכות ומכמתת עלויות תיקון, החלפה והשבה על בסיס בדיקה וראיות. הדוח צריך להסביר את שיטת החישוב, הקשר לנזק וההנחות. הוא יכול לתמוך בתביעה או במחלוקת, אך אינו מבטיח קבילות, תוצאה או פיצוי.",
        }
      : normalizedPath === "הסבר-על-הליך-תביעת-ביטוח-בנזקי-מים-שלב"
      ? {
          question: "איך פותחים תביעת ביטוח על נזילה בלי לאבד ראיות?",
          answer: "עוצרים את מקור המים ומרחיקים סכנה, מצלמים את המקור ואת כל הנזק לפני פינוי או פירוק, מדווחים למבטחת ושומרים מספר תביעה, דוח איתור, מדידות, חשבוניות והתכתבויות. לאחר מכן ממפים את הרטיבות ומעריכים את השיקום. פעולות חירום מבצעים מיד ומתעדים; שמאי רצוי להזמין לפני שינוי משמעותי במצב הנכס.",
        }
      : normalizedPath === "שמאי-נזקי-פריצה"
      ? {
          question: "מה עושה שמאי נזקי פריצה ומתי מזמינים אותו?",
          answer: "שמאי נזקי פריצה מתעד נזק למבנה, למיגון ולתכולה, בונה רשימת רכוש שנגנב או נפגע ומבסס את השווי באמצעות קבלות או אסמכתאות חלופיות. רצוי להזמינו לפני פינוי ותיקון משמעותיים, לאחר דיווח למשטרה ולמבטחת. הכיסוי והתגמולים נקבעים לפי הפוליסה והראיות ואינם מובטחים.",
        }
      : normalizedPath === "שמאי-רכוש-בצפון-כל-מה-שצריך-לדעת-על-נזק"
      ? {
          question: "מתי מזמינים שמאי רכוש בצפון ומה כולל השירות?",
          answer: "מזמינים שמאי רכוש בצפון לאחר נזק למבנה, לתכולה או למערכות כאשר נדרש תיעוד עצמאי וכימות עלויות השיקום. השירות כולל בדיקת הנכס והמסמכים והכנת חוות דעת לפי הממצאים. סניף הצפון נמצא ברחוב השושנים 1, פוריה–נווה עובד; מומלץ לפנות לאחר הרחקת סכנה ולפני פינוי או שיקום משמעותיים.",
        }
      : normalizedPath === "הבדל-בין-שמאי-רכוש-פרטי-לשמאי-רכוש-מטעם"
      ? {
          question: "מה ההבדל בין שמאי פרטי לשמאי חברת הביטוח?",
          answer: "שמאי חברת הביטוח ממונה במסגרת הטיפול של המבטחת ובודק את האירוע עבורה. שמאי פרטי נשכר בידי בעל הנכס או המבוטח ומכין הערכה עצמאית מטעמו. חוות דעת פרטית יכולה לשמש להשוואה ולביסוס מחלוקת, אך אינה מחייבת אוטומטית את המבטחת ואינה מבטיחה פיצוי; הכיסוי נקבע לפי הפוליסה והראיות.",
        }
      : normalizedPath === "שמאי-נזקי-בניה-כל-מה-שצריך-לדעת"
      ? {
          question: "מה בודק שמאי נזקי מבנה ומתי מזמינים אותו?",
          answer: "שמאי נזקי מבנה מתעד ומכמת פגיעה בשלד, במעטפת, בגמר ובמערכות הקבועות, מפריד בין נזק חדש, ליקוי קודם ונזק לתכולה ומכין חוות דעת לצורך תביעה. מזמינים אותו לאחר הרחקת סכנה ולפני פירוק או תיקון משמעותיים; חשש בטיחותי מחייב תחילה בדיקה הנדסית או הנחיית רשות מוסמכת.",
        }
      : normalizedPath === "שמאי-נזקי-מים-המדריך-המלא"
      ? {
          question: "איך מטפלים בנזקי מים בלי לפגוע בתביעה?",
          answer: "עוצרים תחילה את מקור המים ומרחיקים סכנה, מתעדים את מקור האירוע ואת כל הנזק לפני פינוי או תיקון, ושומרים דוחות, מדידות, חשבוניות והצעות מחיר. לאחר מכן ממפים את הרטיבות, מייבשים באופן מבוקר ומעריכים את השיקום. פעולות חירום מבצעים מיד ומתעדים; בדיקה שמאית רצוי לבצע לפני שינוי משמעותי במצב הנכס.",
        }
      : normalizedPath === "נזקי-מים-הצפה-ורטיבות"
      ? {
          question: "מה עושה שמאי נזקי מים?",
          answer: "שמאי נזקי מים מתעד את מקור הנזק והיקפו, בודק אילו חלקי מבנה ותכולה נפגעו, מעריך את עלויות הייבוש והשיקום ומכין חוות דעת מנומקת לצורך תביעת הביטוח. את הבדיקה רצוי לבצע לפני תיקונים נרחבים, תוך שמירת תמונות, דוחות איתור, חשבוניות ותכתובות.",
        }
      : normalizedPath === "נזקי-אש-ופיח"
        ? {
            question: "מה עושה שמאי נזקי אש ופיח?",
            answer: "שמאי נזקי אש ופיח בודק ומתעד נזקי שריפה, עשן, פיח ומי כיבוי למבנה ולתכולה, מעריך עלויות ניקוי, פינוי ושיקום ומכין חוות דעת לתביעת הביטוח. לפני פינוי או תיקון משמעותי חשוב לתעד את הזירה ולשמור דוחות כבאות, רשימות תכולה, חשבוניות והתכתבויות.",
          }
        : normalizedPath === "נזקי-מים-עליה-קפילארית-כיצד-לפעול"
          ? {
              question: "מהי עלייה קפילרית ואיך מזהים אותה?",
              answer: "עלייה קפילרית היא תנועת לחות כלפי מעלה דרך נקבוביות הטיח, הבלוקים וחומרי המבנה. סימנים אופייניים הם קילופי צבע וטיח, התנפחות סמוך לפנלים, מלחים ורטיבות בחלק התחתון של הקיר. אי אפשר לקבוע את המקור לפי המראה בלבד; נדרשים מיפוי לחות, בדיקת מקור המים והבחנה בין כשל צנרת, איטום או לחות קרקע.",
            }
          : normalizedPath === "נזקי-טבע-שיטפונות-וסערה"
            ? {
                question: "מה עושים מיד אחרי נזקי שיטפון או סערה?",
                answer: "לאחר שמוודאים שהכניסה לנכס בטוחה, מתעדים את הנזק לפני פינוי ותיקון, מונעים החמרה סבירה, מדווחים לחברת הביטוח ושומרים קבלות ודוחות. שמאי רכוש בודק נזקי מבנה ותכולה, מפריד בין גורמי הנזק ומעריך את עלויות הייבוש, התיקון והשיקום בהתאם לתנאי הפוליסה.",
              }
          : normalizedPath === "earthquake-damage-compensation"
            ? {
                question: "מה מכסה ביטוח מבנה לרעידת אדמה ומה עושים לאחר נזק?",
                answer: "בודקים בפוליסה שנכלל כיסוי לרעידת אדמה, את סכום ביטוח המבנה, ההשתתפות העצמית, ההחרגות והגדרות הנזק. לאחר שמוודאים שהכניסה בטוחה, מהנדס בודק בטיחות ונזק הנדסי ושמאי רכוש מתעד ומכמת את הנזק לצורך התביעה. הכיסוי וסכום התשלום תלויים בפוליסה ובראיות ואינם מובטחים.",
              }
          : normalizedPath === "שמאי-נזקי-שריפה-מה-נכון-לעשות-כאשר-נגרם"
            ? {
                question: "מתי מזמינים שמאי נזקי שריפה ומה הוא בודק?",
                answer: "מזמינים שמאי נזקי שריפה לאחר שהזירה בטוחה לכניסה ולפני פינוי או שיקום נרחב. השמאי מתעד ומכמת נזקי מבנה, תכולה, עשן, פיח, חום ומי כיבוי ומכין חוות דעת מנומקת לתביעת הביטוח.",
              }
          : normalizedPath === "שמאי-נזק-שער-חשמלי"
            ? {
                question: "מי אחראי לנזק לשער חניה חשמלי ומה עושים מיד?",
                answer: "האחריות תלויה בגורם הנזק ובבעלות על השער, למשל נהג שפגע, ועד בית, בעל נכס או גורם תחזוקה. לאחר שמונעים שימוש בשער לא בטיחותי, מתעדים את הזירה, פרטי האירוע וכל רכיבי השער שנפגעו ושומרים פוליסות, סרטוני מצלמות והצעות מחיר לפני תיקון.",
              }
          : normalizedPath === "שמאי-נזקי-הצפה-כל-מה-שצריך-לדעת-שמאי-רכו"
            ? {
                question: "מה עושה שמאי נזקי הצפה ומתי מזמינים אותו?",
                answer: "שמאי נזקי הצפה ממפה ומתעד את היקף המים והרטיבות, בודק נזקי מבנה ותכולה, מעריך עלויות שאיבה, ייבוש ושיקום ומכין חוות דעת לתביעת הביטוח. מומלץ להזמינו לאחר עצירת סכנה מיידית ולפני פינוי או שיקום משמעותיים, תוך שמירת תמונות, מדידות, דוחות וחשבוניות.",
              }
          : normalizedPath === "נזקי-שוכרים"
            ? {
                question: "מה נחשב נזק שוכר ואיך מוכיחים מי אחראי?",
                answer: "נזק שוכר הוא פגיעה שנגרמה בתקופת השכירות ואינה רק שחיקה סבירה. קביעת האחריות מבוססת על מקור הנזק, חוזה השכירות, פרוטוקול המסירה, תמונות לפני ואחרי ודוחות מקצועיים. שמאי מפריד בין בלאי קודם, תחזוקת בעלים ונזק חדש ומעריך את עלות השבת המצב לקדמותו.",
              }
          : normalizedPath === "שמאי-נזקי-התנגשות"
            ? {
                question: "מה עושה שמאי נזקי התנגשות ברכוש?",
                answer: "שמאי נזקי התנגשות מתעד פגיעה של רכב, כלי עבודה או חפץ במבנה, שער או תשתית, מזהה נזק ישיר ונלווה ומעריך את עלות התיקון או ההחלפה. מומלץ לתעד את הזירה, פרטי המעורבים והצעות המחיר לפני תיקון משמעותי.",
              }
          : normalizedPath === "שמאי-רכוש-בנזקי-מלחמה"
            ? {
                question: "מה עושה שמאי רכוש בנזקי מלחמה מול מס רכוש?",
                answer: "שמאי רכוש פרטי יכול לתעד באופן עצמאי נזק ישיר למבנה ולתכולה, לכמת עלויות ולהכין חוות דעת כאשר נדרש ביסוס מקצועי. הוא אינו מחליף את בדיקת רשות המסים ואינו מבטיח זכאות או סכום פיצוי. יש לדווח במסלול הרשמי, לשמור ראיות ולפעול לפי ההנחיות והדין העדכניים.",
              }
        : null;
    if (serviceFaq) {
      let faqPage = graph.find((item) => item["@type"] === "FAQPage");
      if (!faqPage) {
        faqPage = {
          "@type": "FAQPage",
          "@id": `https://www.rrshamaut.co.il/${normalizedPath}/#/schema/faq`,
          mainEntity: [],
        };
        graph.push(faqPage);
      }
      const entities = Array.isArray(faqPage.mainEntity)
        ? (faqPage.mainEntity as Array<Record<string, unknown>>)
        : [];
      if (!entities.some((entity) => entity.name === serviceFaq.question)) {
        entities.unshift({
          "@type": "Question",
          name: serviceFaq.question,
          acceptedAnswer: { "@type": "Answer", text: serviceFaq.answer },
        });
        faqPage.mainEntity = entities;
      }
    }
    return { ...rec, schema: JSON.stringify(schema) };
  } catch {
    return rec;
  }
}
