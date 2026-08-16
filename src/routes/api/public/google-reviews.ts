import { createFileRoute } from "@tanstack/react-router";

const PLACE_ID = "ChIJRSmMi4xWVSURJZWuczwr72w";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

type Review = {
  author_name: string;
  rating: number;
  text: string;
  relative_time: string;
  time: number;
  profile_photo_url: string;
};
type Payload = {
  rating: number;
  total: number;
  reviews: Review[];
};

const GUY_GALANTI: Review = {
  author_name: "גיא גלנטי",
  rating: 5,
  text: "הגעתי לרפאל דרך המלצות באינטרנט והוא ייצג אותי בהתנהלות מול חברת ביטוח גדולה. נדיר לראות בעל מקצוע ישראלי כזה מקצועי ומתוקתק שלא מעגל פינות. הוא מכיר את החומר היטב, זמין והנחה אותי ביד בכל התהליך ועשה את הסיוט של ההתנהלות מול חברת ביטוח לחיים קלים. ממליץ עליו מכל הלב ובמידה ואצטרך שוב בעתיד ברור לי שחוזר אליו. תודה רבה",
  relative_time: "לפני חודש",
  time: 1780963200,
  profile_photo_url: "",
};

let cache: { at: number; data: Payload } | null = null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=1800",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function fetchLive(apiKey: string): Promise<Payload> {
  // Google Places API v1
  const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=he`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
    reviews?: Array<{
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
      authorAttribution?: { displayName?: string; photoUri?: string };
    }>;
  };
  const reviews: Review[] = (data.reviews || []).slice(0, 5).map((r) => ({
    author_name: r.authorAttribution?.displayName || "",
    rating: r.rating || 5,
    text: r.text?.text || r.originalText?.text || "",
    relative_time: r.relativePublishTimeDescription || "",
    time: r.publishTime ? Math.floor(new Date(r.publishTime).getTime() / 1000) : 0,
    profile_photo_url: r.authorAttribution?.photoUri || "",
  }));
  if (!reviews.some((r) => r.author_name === "גיא גלנטי")) {
    reviews.push(GUY_GALANTI);
  }
  return {
    rating: data.rating ?? 5,
    total: data.userRatingCount ?? 0,
    reviews,
  };
}

export const Route = createFileRoute("/api/public/google-reviews")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const GUY_GALANTI: Review = {
          author_name: "גיא גלנטי",
          rating: 5,
          text: "הגעתי לרפאל דרך המלצות באינטרנט והוא ייצג אותי בהתנהלות מול חברת ביטוח גדולה. נדיר לראות בעל מקצוע ישראלי כזה מקצועי ומתוקתק שלא מעגל פינות. הוא מכיר את החומר היטב, זמין והנחה אותי ביד בכל התהליך ועשה את הסיוט של ההתנהלות מול חברת ביטוח לחיים קלים. ממליץ עליו מכל הלב ובמידה ואצטרך שוב בעתיד ברור לי שחוזר אליו. תודה רבה",
          relative_time: "לפני חודש",
          time: 1780963200,
          profile_photo_url: "",
        };

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
          // No key configured — return empty payload so the client falls back
          // to static reviews without triggering a runtime error.
          return json({ rating: 5, total: 0, reviews: [], disabled: true });
        }
        const now = Date.now();
        if (cache && now - cache.at < CACHE_TTL_MS) {
          return json({ ...cache.data, cached: true });
        }
        try {
          const data = await fetchLive(apiKey);
          // Pinned review — always include at the end if not already returned by Google
          if (!data.reviews.some((r) => r.author_name === "גיא גלנטי")) {
            data.reviews.push(GUY_GALANTI);
          }
          cache = { at: now, data };
          return json({ ...data, cached: false });
        } catch (err) {
          if (cache) {
            // Pinned review — also include if we're falling back to stale cache
            if (!cache.data.reviews.some((r) => r.author_name === "גיא גלנטי")) {
              cache.data.reviews.push(GUY_GALANTI);
            }
            return json({ ...cache.data, cached: true, stale: true });
          }
          return json({ rating: 5, total: 0, reviews: [], error: (err as Error).message });
        }
      },
    },
  },
});