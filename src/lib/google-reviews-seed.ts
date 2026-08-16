// Real Google My Business reviews, extracted from the live Trustindex widget.
// Used as the seed/fallback set so the carousel always renders real social proof
// even when GOOGLE_PLACES_API_KEY is absent or the Places API call fails.

export type Review = {
  author_name: string;
  rating: number;
  text: string;
  relative_time: string;
  time: number;
  profile_photo_url: string;
};

export const SEED_REVIEWS: Review[] = [
  {
    author_name: "גיא גלנטי",
    rating: 5,
    text: "הגעתי לרפאל דרך המלצות באינטרנט והוא ייצג אותי בהתנהלות מול חברת ביטוח גדולה. נדיר לראות בעל מקצוע ישראלי כזה מקצועי ומתוקתק שלא מעגל פינות. הוא מכיר את החומר היטב, זמין והנחה אותי ביד בכל התהליך ועשה את הסיוט של ההתנהלות מול חברת ביטוח לחיים קלים. ממליץ עליו מכל הלב ובמידה ואצטרך שוב בעתיד ברור לי שחוזר אליו. תודה רבה",
    relative_time: "לפני חודש",
    time: 1780963200,
    profile_photo_url: "",
  },
  {
    author_name: "Daniel Gerbi",
    rating: 5,
    text: "רפאל תותח על.\nבחור צדיק ויקר,\nתדברו איתו ולא תתחרטו- קצר וקולע, מי שרוצה לשמוע עליו שיפנה אליי בפרטי בשמחה 🙂",
    relative_time: "לפני 3 חודשים",
    time: 1778112000,
    profile_photo_url: "https://lh3.googleusercontent.com/a-/ALV-UjWOYKuaoeHKmKqhEmpaKfV2QSde4g67IxfOQAgjP73hkbXSOiXL=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "ישראל מור",
    rating: 5,
    text: "הייתה הייתה לנו הצפה בדירה ורפאל ליווה אותנו מול חברת הביטוח בצורה מקצועית ויסודית. הוא היה זמין, הסביר כל שלב בתהליך ודאג שנקבל את מה שמגיע לנו בלי התעסקויות מיותרות. שירות אמין, מקצועי ואדיב — ממליצים מאוד.",
    relative_time: "לפני 3 חודשים",
    time: 1778112000,
    profile_photo_url: "https://lh3.googleusercontent.com/a-/ALV-UjXcRTOkf5KGe_0Egu8_fKxx18g3yLAt_lTagel2DhoL--cuX8w=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "ELIYAHU MIZRAHI",
    rating: 5,
    text: "קיבלתי שירות מעולה מרפאל השמאי היה מקצועי מאוד ונתן לי שרות אדיב מאוד ומהיר ממליץ בחום.",
    relative_time: "לפני 3 חודשים",
    time: 1778544000,
    profile_photo_url: "https://lh3.googleusercontent.com/a-/ALV-UjVv5eIJP1bZqTDOwjQmDYV1XIex_gI9ydiSpCDAJNHiaFDuUiX1=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "alon cohen",
    rating: 5,
    text: "שמאי מקצועי, יסודי ואמין מאוד. הגיע בזמן, בדק את כל הפרטים לעומק ולא עיגל פינות. מעבר למקצועיות, היה גם סבלני, אדיב וזמין לשאלות לאורך התהליך. בהחלט נותן תחושת ביטחון שיש על מי לסמוך.",
    relative_time: "לפני 3 חודשים",
    time: 1778716800,
    profile_photo_url: "https://lh3.googleusercontent.com/a-/ALV-UjVqadUkX9wm8-WhEhy2N-YGzrQvgD2VMQNpbYVa5VHSypKBODR2Kg=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "רועי מימון",
    rating: 5,
    text: "קיבלתי מרפאל שרות מצויין , מהיר ומקצועי. יישר כח",
    relative_time: "לפני 3 חודשים",
    time: 1779235200,
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocJ6C182raR-MvbNx8x1f7YWub3x8qTS3A5KIBiS0YbioOpLqw=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "maayan barkay",
    rating: 5,
    text: "מהיר, מקצועי ושירותי. מומלץ בחום!!",
    relative_time: "לפני 3 חודשים",
    time: 1780272000,
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocLZCx7MC-RodRGSsDTge_a-8owH03Mkxj1c05dCP0j6uklvGQ=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "Samuel",
    rating: 5,
    text: "רפאל איש מקצוע מעולה וגם אדם נעים הליכות. הגיע מהר, הביקור היה יעיל, מקיף ומקצועי. דוח הנזק היה מוכן תוך ימים בודדים. הדוח לא רק קובע את סכום הנזק, אלא מהווה חוות דעת משפטית של מומחה. הודות לעבודתו זכיתי במלוא סכום הפיצוי שדרשתי בתביעה.",
    relative_time: "לפני 3 חודשים",
    time: 1780358400,
    profile_photo_url: "https://lh3.googleusercontent.com/a-/ALV-UjUNO-1nKlSYfHMjRqY3M1UK39Bhrspjohj19DWL9N7RBgrQnjw=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "ישי יחיאל",
    rating: 5,
    text: "הכישרון של רפאל החכמה הלדעת מה נכון לכל אחד להתאים לו את מה שהוא אמור לקבל זה פשוט נדיר בחור צעיר נמרץ וחכם ממליץ ביותר אלוףףף",
    relative_time: "לפני 3 חודשים",
    time: 1780617600,
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocImzwnNVc33b82wj9wrJmoXOzCyo7-DdHbric8nAIlAB3yulg=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "עלי חיראלדין",
    rating: 5,
    text: "אחלה שרות .בן אדם מקסים .ממליץ מאוד",
    relative_time: "לפני 3 חודשים",
    time: 1780963200,
    profile_photo_url: "https://lh3.googleusercontent.com/a/ACg8ocI3q1dUEcambbxdFSAMTsLf7rHxFZZtVIBNXvXhw5PAgDPDyA=w40-h40-c-rp-mo-br100",
  },
  {
    author_name: "ענבל קופלר",
    rating: 5,
    text: "לקחתי את רפאל להערכת נזק מים בדירה שלי והייתי מרוצה מעל ומעבר. רפאל מקצועי מאוד, יסודי, אמין וישר מהרגע הראשון. הוא בדק את הכל בצורה מעמיקה ונתן שירות מצוין. מומלץ בחום רב לכל מי שמחפש שמאות מקצועית ושקט נפשי!",
    relative_time: "לפני 3 חודשים",
    time: 1780963200,
    profile_photo_url: "https://lh3.googleusercontent.com/a-/ALV-UjWbFXO3hL87V9BTK4Fz5M8v3HFAd_aAFQRgEf4Oen5zwM3dPx4t=w40-h40-c-rp-mo-br100",
  },
];

export const SEED_RATING = 5;
export const SEED_TOTAL = 513;
