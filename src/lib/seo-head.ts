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
    const relatedLinks: Record<string, string[]> = {
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
    const serviceFaq = normalizedPath === "נזקי-מים-הצפה-ורטיבות"
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
                question: "מה עושים אחרי שנגרמו נזקי רעידת אדמה לנכס?",
                answer: "לאחר שמוודאים שהמבנה בטוח לכניסה, מתעדים נזקי מבנה ותכולה לפני פינוי או תיקון, מדווחים לחברת הביטוח ושומרים דוחות, תמונות, חשבוניות והצעות מחיר. שמאי רכוש מכמת את הנזק ובוחן את הכיסוי, סכומי הביטוח וההשתתפות העצמית לפי הפוליסה.",
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
