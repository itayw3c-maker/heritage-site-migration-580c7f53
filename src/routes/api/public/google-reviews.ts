import { createFileRoute } from "@tanstack/react-router";
import {
  SEED_REVIEWS,
  SEED_RATING,
  SEED_TOTAL,
  type Review,
} from "@/lib/google-reviews-seed";

const PLACE_ID = "ChIJRSmMi4xWVSURJZWuczwr72w";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

type Payload = {
  rating: number;
  total: number;
  reviews: Review[];
};

// The Places API only ever returns 5 reviews. Merge them over the full seed set
// (scraped from the live Trustindex widget) so the carousel always shows the
// whole wall, with fresh API copy winning for any reviewer present in both.
function mergeWithSeed(live: Review[]): Review[] {
  const seen = new Set(live.map((r) => r.author_name));
  return [...live, ...SEED_REVIEWS.filter((r) => !seen.has(r.author_name))];
}

const FALLBACK: Payload = {
  rating: SEED_RATING,
  total: SEED_TOTAL,
  reviews: SEED_REVIEWS,
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
  return {
    rating: data.rating ?? SEED_RATING,
    total: data.userRatingCount ?? SEED_TOTAL,
    reviews: mergeWithSeed(reviews),
  };
}

export const Route = createFileRoute("/api/public/google-reviews")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
          // No key configured — serve the seed wall so the carousel still shows
          // real social proof rather than triggering a runtime error.
          return json({ ...FALLBACK, disabled: true });
        }
        const now = Date.now();
        if (cache && now - cache.at < CACHE_TTL_MS) {
          return json({ ...cache.data, cached: true });
        }
        try {
          const data = await fetchLive(apiKey);
          cache = { at: now, data };
          return json({ ...data, cached: false });
        } catch (err) {
          if (cache) {
            return json({ ...cache.data, cached: true, stale: true });
          }
          return json({ ...FALLBACK, error: (err as Error).message });
        }
      },
    },
  },
});