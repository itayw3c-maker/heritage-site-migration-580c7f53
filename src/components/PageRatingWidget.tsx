import { useEffect, useState } from "react";

// A page-level star rating widget. Deliberately independent of any
// third-party review source (Google Business Profile included): every vote
// here is cast by a visitor on this exact page, stored in this site's own
// Supabase table (public.page_ratings), and starts from zero. See the
// migration for the full rationale.

interface PageRatingWidgetProps {
  pageSlug: string;
}

const STORAGE_PREFIX = "rr-page-rating:";

export function PageRatingWidget({ pageSlug }: PageRatingWidgetProps) {
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + pageSlug);
    if (stored) setMyRating(Number(stored));

    let cancelled = false;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("page_ratings")
        .select("rating")
        .eq("page_slug", pageSlug);
      if (cancelled) return;
      if (!error && data) {
        setCount(data.length);
        setAverage(
          data.length ? data.reduce((sum, r) => sum + r.rating, 0) / data.length : null,
        );
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pageSlug]);

  async function submitRating(rating: number) {
    if (myRating || submitting) return;
    setSubmitting(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase
      .from("page_ratings")
      .insert({ page_slug: pageSlug, rating });
    setSubmitting(false);
    if (error) return;
    window.localStorage.setItem(STORAGE_PREFIX + pageSlug, String(rating));
    setMyRating(rating);
    setCount((c) => c + 1);
    setAverage((prev) => {
      const prevSum = (prev ?? 0) * count;
      return (prevSum + rating) / (count + 1);
    });
  }

  if (!loaded) return null;

  const displayValue = hoverRating ?? myRating ?? 0;

  return (
    <div className="rr-page-rating" dir="rtl">
      <div className="rr-page-rating__stars" role={myRating ? undefined : "radiogroup"} aria-label="דרגו את המדריך הזה">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="rr-page-rating__star"
            aria-label={`דרג ${n} מתוך 5 כוכבים`}
            disabled={!!myRating || submitting}
            onMouseEnter={() => !myRating && setHoverRating(n)}
            onMouseLeave={() => setHoverRating(null)}
            onClick={() => submitRating(n)}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path
                d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.5l-5.9 3.1 1.3-6.6-4.9-4.6 6.6-.8L12 2.5z"
                fill={n <= displayValue ? "#CBA436" : "none"}
                stroke="#CBA436"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        ))}
      </div>
      <div className="rr-page-rating__summary">
        {myRating ? (
          <span>תודה שדירגתם! הדירוג שלכם: {myRating} מתוך 5.</span>
        ) : (
          <span>דרגו את המדריך הזה</span>
        )}
        {count > 0 && (
          <span className="rr-page-rating__count">
            {" "}
            · {average?.toFixed(1)} מתוך 5 ({count} {count === 1 ? "דירוג" : "דירוגים"})
          </span>
        )}
      </div>
    </div>
  );
}
