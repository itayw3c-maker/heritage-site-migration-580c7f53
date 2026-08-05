import { useEffect, useState } from "react";
import reviewsData from "@/generated/reviews.json";
import { ReviewsModal } from "@/components/ReviewsModal";

export function GoogleG({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.4 6.64v5.52h7.11c4.16-3.83 6.57-9.47 6.57-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.55-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.44 2.1-5.73 0-10.58-3.87-12.3-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.7 28.18A13.4 13.4 0 0 1 11 24c0-1.45.25-2.86.7-4.18v-5.7H4.34A21.9 21.9 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.36-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.36 5.7c1.72-5.2 6.57-9.07 12.3-9.07z"
      />
    </svg>
  );
}

export function Stars({ rating = 5, size = 14 }: { rating?: number; size?: number }) {
  return (
    <span className="rr-stars" style={{ display: "inline-flex", gap: 1 }} aria-label={`${rating} מתוך 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill={i < Math.round(rating) ? "#c9a227" : "#d8dde4"}
            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          />
        </svg>
      ))}
    </span>
  );
}

export function SocialRatingFloat() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const data = reviewsData;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="rr-social-float" aria-live="polite">
        {visible && (
          <button
            type="button"
            className="rr-social-badge"
            onClick={() => setOpen(true)}
            aria-label={`דירוג ${data.rating} בגוגל, ${data.total_reviews} ביקורות — פתיחת הביקורות`}
          >
            <span className="rr-social-badge__icon">
              <GoogleG size={52} />
            </span>
            <span className="rr-social-badge__body">
              <span className="rr-social-badge__rating">{data.rating.toFixed(1)}</span>
              <Stars rating={data.rating} size={16} />
              <span className="rr-social-badge__count">{data.total_reviews} ביקורות בגוגל</span>
            </span>
          </button>
        )}
        <button
          type="button"
          className="rr-social-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "הסתרת ווידג'ט הביקורות" : "הצגת ווידג'ט הביקורות"}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
            </svg>
          )}
        </button>
      </div>
      {open && <ReviewsModal data={data} onClose={() => setOpen(false)} />}
    </>
  );
}
