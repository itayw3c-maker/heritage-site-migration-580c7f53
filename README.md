# Perfect Pixel Migration - rrshamaut co il

אנחנו מבצעים מיגרציה פיקסל-פרפקט של אתר וורדפרס/אלמנטור קיים אל Lovable. זה לא עיצוב מחדש — המטרה היא שחזור אחד-לאחד של האתר הקיים.

## על האתר
- האתר: rrshamaut.co.il — "רפאל שמאות רכוש | RR" — משרד שמאות רכוש (ניהול תביעות ביטוח, הערכת נזקים, ייעוץ וליווי).
- שפה: עברית, RTL מלא. `<html dir="rtl" lang="he-IL">`.
- נבנה במקור עם Elementor Pro על תבנית Hello Elementor.

## מה מצורף להודעה הזו
1. `home-hero-1280x900.png` — צילום ההירו בפרופורציות אמת (1280x900).
2. `home-full-1280.png` — צילום full-page בדסקטופ. שים לב: סקשנים בגובה 100vh נמתחים בצילום כזה — הוא לאימות סדר וסטרוקטורה, לא פרופורציות.
3. `home-mobile-390.png` — צילום full-page במובייל (390px).

## מה אני צריך שתקים עכשיו (שלב תשתית בלבד)
1. פרויקט React SPA עם RTL מלא: `dir="rtl" lang="he-IL"` על ה-html.
2. טעינת פונטים מ-Google Fonts CDN (לא self-hosted): Assistant (200-800), Roboto (100-900), Roboto Slab (100-900). אלה הפונטים של האתר.
3. קומפוננטות גלובליות ריקות בינתיים: Header, Footer — הן ימולאו בהודעה הבאה מתוך ה-HTML המקורי.
4. Routing: כל הנתיבים של האתר הם סלאגים בעברית (ראה מפת קישורים למטה). צור catch-all route שמציג placeholder מינימלי ("העמוד בבנייה") לכל נתיב שטרם נבנה. חובה `decodeURIComponent` על ה-splat.
5. בהודעה הבאה אשלח את ה-HTML המקורי המלא של דף הבית עם כל ה-CSS מוטמע — אל תבנה עדיין שום עיצוב לדף הבית. אל תמציא עיצוב.

## מחרוזת ה-body המלאה של דף הבית (קריטי — תידרש בהודעה הבאה)
```
rtl home wp-singular page-template page-template-elementor_header_footer page page-id-57 wp-custom-logo wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default esm-default hello-elementor-default elementor-default elementor-template-full-width elementor-kit-7 elementor-page elementor-page-57
```
המחלקה `elementor-kit-7` היא scope לכל משתני העיצוב הגלובליים — בלעדיה הצבעים והטיפוגרפיה נשברים.

## טוקנים גלובליים (נמדדו מהמקור — משתני elementor-kit-7)
- --e-global-color-primary: #6EC1E4
- --e-global-color-secondary: #54595F
- --e-global-color-text: #7A7A7A
- --e-global-color-accent: #61CE70
- --e-global-color-6a54089: #056FC4 (כחול כותרות)
- --e-global-color-33ec037: #CBA436 (זהב — כפתורים/הדגשות)
- --e-global-color-beaabc7: #063760 (כחול כהה — פוטר/רקעים)
- --e-global-color-b9244b9: #F5F7FBB8
- --e-global-color-ebc7564: #FFFFFF
- טיפוגרפיה ראשית: Roboto 600; טקסטים: Assistant.
⚠️ אלה עובדות על המשתנים בלבד — אל תסיק מהם "צבע כפתורים כללי". העיצוב המלא יגיע ב-CSS המקורי.

## פרטי קשר (מהאתר החי)
- טלפון: 077-805-1266 (tel:0778051266)
- אימייל: office@rrshamaut.co.il (במקור מוגן Cloudflare — אצלנו יהיה mailto רגיל)
- וואטסאפ: https://wa.me/502629120 (כפי שמופיע במקור)
- אינסטגרם: https://www.instagram.com/rrshamaut?igsh=MTVxNDk4dDF2b2U0MA==
- יוטיוב: https://youtube.com/@rephael.shamaut-rr?si=9u5i_Pdh8ZlYB3V4
- טיקטוק: https://www.tiktok.com/@rephaelshamaut
- פייסבוק: https://m.facebook.com/rrshamaut/
- Threads: https://www.threads.com/@rrshamaut
- סניף דרום: הבנאים 5, א.ת אשדוד | סניף צפון: השושנים 1, פוריה - נווה עובד

## מבנה דף הבית (מהצילומים, לפי הסדר)
1. הדר: לוגו RR מימין, תפריט ניווט, כפתור טלפון זהב משמאל
2. הירו: כותרת H1 "שמאי רכוש לנזקי רכוש רפאל ריבוח", טקסט, תמונת השמאי, תגי איגוד השמאים ותו האיכות
3. שורת מונים: 80 לקוחות מרוצים | 3,000,000 הערכות נזק | 10 נכסים שבדקנו | 4,000,000 סה"כ תגמולי ביטוח
4. "לקוחות שבחרו בנו" — קרוסלת לוגואים
5. השירותים שלנו — גריד כרטיסי שירות עם תמונות
6. "הליך תביעת ביטוח" — שלבים ממוספרים 01-08
7. "אודות רפאל שמאות רכוש" — טקסט + תמונה
8. "צוות החברה" — כרטיסי צוות
9. "ההצלחות שלנו" — קרוסלת סיפורי הצלחה
10. "למה לבחור דווקא ברפאל שמאות רכוש" — סקשן כחול עם אייקונים
11. "גלריית הפרויקטים" — גלריה
12. "סרטונים" — סקשן וידאו
13. "כתבו עלינו" — אזכורי עיתונות
14. "מאמרים בנושא שמאות רכוש" — גריד מאמרים
15. "מה אומרים עלינו" — ביקורות Google
16. "מהי שמאות רכוש?" + "שירותי שמאי רכוש" — סקשני טקסט SEO
17. פוטר כחול כהה: מפה, עמודות קישורים, פרטי קשר

## מפת קישורים מלאה — הסלאגים המקוריים בדיוק
⛔ איסור מוחלט להמציא סלאגים, לתרגם אותם לאנגלית או "לנרמל" אותם. הסלאגים בעברית הם ה-SEO של האתר. השתמש בהם בדיוק כפי שהם כאן.

### תפריט ההדר
- דף הבית → /
- אודות → /about/
- צוות המשרד (הורה, בלי קישור):
  - רפאל ריבוח → /about/השמאי-רפאל-ריבוח-מייסד-ובעלים-2/
  - אינג', ארז אריה → /about/המהנדס-והשמאי-ארז-אריה-מומחה-הנדסי-ו/
  - עו"ד קובי ליבוביץ' → /about/השמאי-רפאל-ריבוח-מייסד-ובעלים/
- השירותים שלנו (הורה, href="#"):
  - ייעוץ וליווי תביעות ביטוח → /ייעוץ-וליווי-תביעות-ביטוח/
  - שמאי נזקי מים הצפה ורטיבות → /נזקי-מים-הצפה-ורטיבות/
  - שמאי נזקי אש ופיח → /נזקי-אש-ופיח/
  - שמאי נזקי טבע שיטפונות וסערה → /נזקי-טבע-שיטפונות-וסערה/
  - נזקי שוכרים → /נזקי-שוכרים/
  - נזקי פריצה → /שמאי-נזקי-פריצה/
  - נזקי התנגשות → /שמאי-נזקי-התנגשות/
  - נזקי עבודות קבלניות → /שמאי-נזקי-עבודות-קבלניות/
  - חו"ד קבילה משפטית → /חווד-קבילה-משפטית/
  - הערכת שווי רכוש → /הערכת-שווי-רכוש/
  - הערכת שמאות לריהוט עתיק → /הערכת-שמאות-לריהוט-עתיק/
  - הערכת רכוש לצורכי הזדכות במס שבח → /הערכת-רכוש-לצורכי-הזדכות-במס-שבח/
- שאלות תשובות → /שאלות-תשובות/
- ההצלחות שלנו → /ההצלחות-שלנו/
- מדיה (הורה, בלי קישור):
  - כתבו עלינו → /כתבו-עלינו/
  - סרטונים → /סרטונים/
  - גלריית נזקים → /גלריית-נזקי-מים-אש-ומלחמה/
  - הסמכות → /תעודות/ (מופיע בגרסת המובייל של התפריט)
- מאמרים → /category/מידע-מקצועי/
- צור קשר → /צור-קשר/

### פוטר — קישורים נוספים שלא בתפריט
- דרושים → /jobs/
- מדיניות פרטיות → /מדיניות-פרטיות/
- הצהרת נגישות → /הסדרי-נגישות/
- מפת אתר → /מפת-אתר/
- מאמרים אחרונים בפוטר (סלאגים באנגלית — כך במקור):
  - איך לתבוע חברת ביטוח על נזקי פריצה לרכוש עסקי? → /business-burglary-claim/
  - שמאות רכוש לנזילה מגג – בדיקה והערכה מקצועית → /leak-from-the-roof/
  - האם להסתפק בהצעת מחיר מקבלן או לשכור שמאי פרטי? → /price-quote-from-a-contractor/
  - הערכת שמאי לנזק מים מדירות עליונות – מתודולוגיה מלאה → /superior-apartments/
  - הערכת נזקים למערכות חימום תת רצפתי → /underfloor-heating/
  - איך שמאי רכוש מודד היקף נזק הצפה בנכס → /flood-damage-to-property/
  - איך מבצעים הערכת נזק למערכות חשמל? → /damage-to-electrical-systems/
  - נזילה בצנרת דלוחין → /leak-in-the-deluhin-pipeline/
- ⚠️ בפוטר של האתר החי "נזקי טבע שיטפונות וסערה" מקשר (כנראה בטעות) ל-/נזקי-אש-ופיח/ — משחזרים אחד-לאחד, אל תתקן.

זהו. בשלב הזה: תשתית + routing + פונטים בלבד. אל תעצב שום דבר — העיצוב יגיע כ-HTML+CSS מקורי בהודעה הבאה.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://heritage-site-migration.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/84e35538-730b-4b9b-bb23-6c04421a2835).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
