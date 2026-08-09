import { useEffect, useState } from "react";
import { GoogleG, Stars } from "@/components/SocialRatingFloat";

type Review = {
  author_name: string;
  text: string;
  rating: number;
  relative_time: string;
  profile_photo_url: string;
};

type ReviewsData = {
  business_name: string;
  rating: number;
  total_reviews: number;
  profile_url: string;
  write_review_url: string;
  reviews: Review[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
}

function ModalReviewCard({ review }: { review: Review }) {
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <li className="rr-review-card">
      <div className="rr-review-card__top">
        <span className="rr-review-card__avatar rr-review-card__avatar--initials" aria-hidden="true">
          {initials(review.author_name)}
          {review.profile_photo_url && !photoFailed ? (
            <img
              src={review.profile_photo_url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{ opacity: photoLoaded ? 1 : 0 }}
              onLoad={() => setPhotoLoaded(true)}
              onError={() => setPhotoFailed(true)}
            />
          ) : null}
        </span>
        <div className="rr-review-card__meta">
          <span className="rr-review-card__name">{review.author_name}</span>
          {review.relative_time && (
            <span className="rr-review-card__time">{review.relative_time}</span>
          )}
          <Stars rating={review.rating} size={14} />
        </div>
      </div>
      <p className="rr-review-card__text">{review.text}</p>
    </li>
  );
}

export function ReviewsModal({ data, onClose }: { data: ReviewsData; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="rr-reviews-overlay" role="presentation" onClick={onClose}>
      <div
        className="rr-reviews-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`ביקורות גוגל על ${data.business_name}`}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="rr-reviews-modal__header">
          <button
            type="button"
            className="rr-reviews-modal__close"
            onClick={onClose}
            aria-label="סגירה"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>
          <div className="rr-reviews-modal__head-main">
            <GoogleG size={46} />
            <div className="rr-reviews-modal__head-text">
              <span className="rr-reviews-modal__biz">{data.business_name}</span>
              <span className="rr-reviews-modal__score">
                <strong>{data.rating.toFixed(1)}</strong>
                <Stars rating={data.rating} size={17} />
              </span>
              <span className="rr-reviews-modal__count">
                {data.total_reviews} ביקורות בגוגל
              </span>
            </div>
          </div>
          <a
            className="rr-reviews-modal__cta"
            href={data.write_review_url}
            target="_blank"
            rel="noopener nofollow"
          >
            כתבו לנו ביקורת בגוגל
          </a>
        </header>
        <ul className="rr-reviews-modal__list">
          {data.reviews.map((review, i) => (
            <ModalReviewCard key={`${review.author_name}-${i}`} review={review} />
          ))}
        </ul>
        <footer className="rr-reviews-modal__footer">
          <span>powered by</span>
          <GoogleG size={18} />
          <span>Google</span>
          <a href={data.profile_url} target="_blank" rel="noopener nofollow">
            לכל הביקורות בפרופיל הגוגל
          </a>
        </footer>
      </div>
    </div>
  );
}
