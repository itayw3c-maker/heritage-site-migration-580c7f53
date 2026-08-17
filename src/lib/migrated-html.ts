function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function linkPurpose(href: string): string {
  try {
    const pathname = new URL(href, "https://www.rrshamaut.co.il").pathname;
    const slug = decodeURIComponent(pathname).split("/").filter(Boolean).pop() ?? "העמוד";
    return slug.replace(/[-_]+/g, " ").trim() || "העמוד";
  } catch {
    return "העמוד המקושר";
  }
}

const INTERNAL_LINK_REPLACEMENTS = new Map([
  [
    "/about/השמאי-רפאל-ריבוח-מייסד-ובעלים-2/",
    "/about/השמאי-רפאל-ריבוח-מייסד-ובעלים/",
  ],
  ["/recommended-property-appraiser/", "/private-appraiser/"],
  [
    "/שמאי-רכוש-תפקידו-וחשיבותו/",
    "/תפקידו-המרכזי-של-שמאי-רכוש-פרטי/",
  ],
]);

function repairInternalHref(href: string): string {
  try {
    const url = new URL(href, "https://www.rrshamaut.co.il");
    if (!/^(?:www\.)?rrshamaut\.co\.il$/i.test(url.hostname)) return href;

    const decodedPath = decodeURIComponent(url.pathname);
    const replacement = INTERNAL_LINK_REPLACEMENTS.get(decodedPath);
    if (!replacement) return href;

    // Keep migrated links relative so they work in every environment and avoid
    // an unnecessary redirect hop on the live domain.
    return `${replacement}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/**
 * Normalise migrated WordPress HTML before it reaches SSR or the browser.
 * Internal links should stay in the current browsing context, while genuine
 * content images need a useful fallback name. Loader/error placeholders remain
 * deliberately decorative so screen readers do not announce them.
 */
export function improveMigratedHtml(html: string, pageTitle: string): string {
  const fallbackAlt = escAttr(pageTitle);
  const professionallyCorrectedHtml = /ערכי כינון.*ערכי שיפוי/.test(pageTitle)
    ? html
        .replace(
          "שיפוי הוא למעשה הסכום שמכסה את הנזק באופן בסיסי, ואין עליו ויכוח בין המבוטח לחברת הביטוח.",
          "שיפוי מבטא בדרך כלל את שווי הרכוש במועד הנזק, לאחר בחינת מצבו והבלאי. עצם הסכום והכיסוי עשויים להיות שנויים במחלוקת ותלויים בפוליסה ובראיות.",
        )
        .replace(
          "חברת הביטוח תשלם תחילה את סכום השיפוי, שהוא הסכום שאינו שנוי במחלוקת ואשר מתייחס לשיקום הנכס ע\"פ שווי שיקום הנכס בהתאם למצבו הישן.",
          "חברת הביטוח עשויה לשלם תחילה סכום לפי ערך שיפוי, בהתאם לעמדתה, לתנאי הפוליסה ולמסמכים שהוצגו; אין בכך קביעה שכל הסכום או האחריות מוסכמים.",
        )
        .replace(
          "במצבים כאלה, ניתן לסגור את התיק ללא הצורך בהצגת חשבוניות לתיקון בפועל. פשרה כזו יכולה לעיתים להיות גבוהה יותר מערך הכינון שהוערך על ידי שמאי הביטוח.",
          "במצבים מסוימים הצדדים עשויים להסכים על פשרה כוללת ועל דרישות מסמכים שונות, אך הדבר מחייב הסכמה מפורשת ואינו מבטיח סכום מסוים או ויתור על חשבוניות.",
        )
        .replace(
          "שמאי פרטי יסייע לכם לוודא שהפיצוי שתקבלו אכן תואם את היקף הנזק, וכך יבטיח שתפיקו את המרב מהתביעה מול חברת הביטוח.",
          "שמאי פרטי יכול לסייע בתיעוד ובכימות הנזק ובהצגת חוות דעת מקצועית; ההכרעה בכיסוי ובתשלום תלויה בפוליסה, בראיות ובהסכמות ואינה מובטחת.",
        )
    : /תביעת נזקי הצפה/.test(pageTitle)
      ? html
          .replace(
            "נתקו חשמל כדי למנוע סכנת התחשמלות.",
            "אל תיכנסו למים ואל תגעו בלוח, בכבל או בציוד חשמלי; ניתוק ובדיקת החשמל יבוצעו בידי חשמלאי מוסמך או גורם חירום מתאים.",
          )
          .replace(
            "תיעוד מקצועי תומך בתביעה מול חברת הביטוח ומבטיח פיצוי מלא.",
            "תיעוד מקצועי עשוי לתמוך בתביעה מול חברת הביטוח; הכיסוי וסכום התשלום תלויים בפוליסה ובראיות ואינם מובטחים.",
          )
          .replace(
            "הדו\"ח שלו מהווה הוכחה רשמית לקבלת פיצוי מלא ומוצדק.",
            "חוות הדעת שלו מתעדת ומכמתת את הנזק ויכולה לתמוך בתביעה, אך אינה מבטיחה קבלת פיצוי או סכום מסוים.",
          )
          .replace(
            "הערכה מקצועית תבטיח פיצוי מלא ותמנע עוגמת נפש עתידית.",
            "הערכה מקצועית מסייעת לבסס את היקף הנזק ואת עלויות השיקום, אך אינה מבטיחה פיצוי או תוצאה.",
          )
          .replace(
            "המומחים ילוו אתכם משלב הבדיקה ועד קבלת הפיצוי המלא.",
            "המומחים יכולים ללוות אתכם משלב הבדיקה ועד להצגת התביעה והמסמכים, ללא הבטחת כיסוי או תשלום.",
          )
    : /נזילה מהשכן מעליי.*שכן מסרב/.test(pageTitle)
      ? html
          .replace(
            "שמאי יוכל להעריך את הנזקים ולתת חוות דעת מקצועית על מקור הנזילה.",
            "שמאי רכוש יכול להעריך ולכמת את הנזקים; מאתר נזילות, שרברב או מהנדס מתאים בודקים את מקור המים בתחום מומחיותם, וממצאיהם יכולים להשתלב בחוות הדעת.",
          )
          .replace(
            "שמאי רכוש פרטי יבחן את מקורות הנזילה ויעריך את הנזק הכלכלי שנגרם. הוא יכול לעזור להוכיח שהנזילה נגרמה כתוצאה מהשכן, ובכך להקל על תהליך התביעה.",
            "שמאי רכוש פרטי בוחן את ממצאי האיתור ואת הנזק הכלכלי שנגרם. חוות הדעת יכולה לתמוך בקשר בין האירוע לנזק, אך אינה מחליפה איתור מקצועי ואינה מוכיחה לבדה אחריות של שכן.",
          )
          .replace(
            "שמאי רכוש יוכל לעזור בהערכת הנזקים ובמקסום הפיצוי.",
            "שמאי רכוש יכול לסייע בהערכת הנזקים ובהצגת תביעה מבוססת, ללא הבטחת סכום או תוצאה.",
          )
          .replace(
            "חשוב לפעול בצורה מסודרת ומחושבת, לשמור תיעוד, ולהיעזר במומחים כמו שמאי רכוש כדי להבטיח את המגיע לך.",
            "חשוב לפעול בצורה מסודרת, לשמור תיעוד ולהיעזר בבעלי המקצוע המתאימים כדי לבסס את מקור הנזק, היקפו ודרכי הפעולה האפשריות.",
          )
    : /שמאי רכוש מחיר.*אופן התמחור/.test(pageTitle)
      ? html
          .replace(
            /המחירים עבור חוות דעת שמאית נעים בין <strong>2,500 ל-10,000 ש"ח<\/strong> בהתאם להיקף העבודה\./,
            "אין טווח מחיר אחיד שמתאים לכל חוות דעת; יש לקבל הצעה כתובה לפי היקף המינוי, מורכבותו והתוצרים הנדרשים.",
          )
          .replace(
            /במקרה זה, השמאי יגבה <strong>אחוזים מהתגמולים<\/strong> שיתקבלו, הנעים בין <strong>10% ל-20%<\/strong>, בתוספת מע"מ\./,
            "בתיקי ליווי אופן שכר הטרחה נקבע בהסכם בכתב ועשוי להיות קבוע, מדורג או מבוסס מנגנון מוסכם אחר; אין להציג אחוז אחיד כנהוג בכל תיק.",
          )
          .replace(
            /<blockquote><p><strong>"חברת הביטוח תישא בעלות שכר טרחת השמאי שהוזמן על ידי המבוטח, בתנאי שהשכר הינו סביר ובהתאם למדיניות שנקבעה על ידי החברה\."<\/strong><\/p><\/blockquote>/,
            "<blockquote><p><strong>החזר שכר טרחה אינו אוטומטי: יש לבדוק את נוסח הפוליסה, הצורך והסבירות של ההוצאה, הקשר לתביעה והמסמכים שנדרשו.</strong></p></blockquote>",
          )
          .replace(
            "המשמעות היא שבמקרים בהם נדרש שמאי רכוש לצורך הערכת נזקים, המבוטח יכול לצפות לקבל פיצוי בגין שכר טרחת השמאי בתנאי שהשכר נמצא בתחום הסביר והמקובל בשוק.",
            "המשמעות היא שיש לשמור הסכם, חשבונית, הוכחת תשלום ותוצר מקצועי ולברר מראש את עמדת המבטחת; גם שכר שנראה סביר אינו מבטיח החזר מלא או חלקי.",
          )
          .replace(/2,500 – 10,000/g, "לפי היקף והצעה")
          .replace(/10% – 20% מהתגמולים \+ מע"מ/g, "לפי הסכם בכתב")
          .replace(
            "חברת הביטוח מחויבת להחזיר שכר טרחה סביר לפי הפוליסה התקנית",
            "החזר תלוי בפוליסה, בצורך, בסבירות ובמסמכים",
          )
          .replace(
            "שמאי רכוש פרטי יכול לשמש גם כעד מומחה במקרה של תביעה בבית המשפט, ובכך לעזור להבטיח שהתוצאה תהיה לטובתכם.",
            "שמאי רכוש פרטי עשוי לשמש כעד מומחה בהתאם למינוי ולכללי ההליך; חוות דעת אינה מבטיחה שהערכאה תקבל את העמדה או את הסכום.",
          )
          .replace(
            "הערכה של <strong>שמאי רכוש פרטי</strong> יכולה להבטיח שהפיצוי שתהיו זכאים לו יהיה הוגן ומדויק.",
            "הערכה של <strong>שמאי רכוש פרטי</strong> יכולה לסייע לבסס את היקף הנזק והעלויות, אך אינה מבטיחה זכאות או סכום פיצוי.",
          )
      : html;
  return professionallyCorrectedHtml
    .replace(/\bhref=(["'])([^"']+)\1/gi, (_match, quote: string, href: string) =>
      `href=${quote}${escAttr(repairInternalHref(href))}${quote}`,
    )
    .replace(/(<div\b[^>]*?)\s+role=["']list["']([^>]*>)/gi, "$1$2")
    .replace(/(<article\b[^>]*?)\s+role=["']listitem["']([^>]*>)/gi, "$1$2")
    .replace(/<a\b([^>]*\bhref=["'](?:\/|https?:\/\/(?:www\.)?rrshamaut\.co\.il)[^>]*?)>/gi, (tag) =>
      tag.replace(/\s+target=["']_blank["']/i, ""),
    )
    .replace(/<a\b([^>]*\bhref=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi, (tag, attrs: string, href: string, body: string) => {
      const text = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim();
      if (text !== "עוד" || /\baria-label\s*=/i.test(attrs)) return tag;
      return tag.replace(/^<a\b/i, `<a aria-label="${escAttr(`קראו עוד על ${linkPurpose(href)}`)}"`);
    })
    .replace(/<img\b([^>]*)>/gi, (tag, attrs: string) => {
      if (/\balt=["'][^"']+["']/i.test(attrs)) return tag;
      const decorative =
        /\bsuper-picture-img-(?:loading|error)\b/i.test(attrs) ||
        /\bsrc=["']data:image\/svg\+xml/i.test(attrs) ||
        !/\bsrc=["'][^"']+["']/i.test(attrs);
      if (decorative) {
        if (/\balt=["']["']/i.test(attrs)) return tag;
        return tag.replace(/^<img\b/i, '<img alt=""');
      }
      if (/\balt=["']["']/i.test(attrs)) {
        return tag.replace(/\balt=["']["']/i, `alt="${fallbackAlt}"`);
      }
      return tag.replace(/^<img\b/i, `<img alt="${fallbackAlt}"`);
    });
}
