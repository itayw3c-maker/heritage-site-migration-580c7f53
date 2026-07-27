// Client-side live reviews hydrator: replaces the trustindex widget on the
// home page with 5 fresh reviews from /api/public/google-reviews, and updates
// the floating rpi badge total. Silent no-op on error (fallback = original).

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
  error?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

function starsHtml(rating: number): string {
  const full = Math.round(rating);
  let out = '<span class="lgr-stars" aria-label="' + rating + '">';
  for (let i = 0; i < 5; i++) {
    out += `<span class="lgr-star${i < full ? " lgr-star-on" : ""}">★</span>`;
  }
  out += "</span>";
  return out;
}

function reviewCard(r: Review): string {
  const img = r.profile_photo_url
    ? `<img class="lgr-avatar" src="${escapeHtml(r.profile_photo_url)}" alt="${escapeHtml(r.author_name)}" loading="lazy" referrerpolicy="no-referrer" />`
    : `<div class="lgr-avatar lgr-avatar-fallback">${escapeHtml(initials(r.author_name))}</div>`;
  return `
    <article class="lgr-card">
      <header class="lgr-head">
        ${img}
        <div class="lgr-who">
          <div class="lgr-name">${escapeHtml(r.author_name)}</div>
          <div class="lgr-date">${escapeHtml(r.relative_time)}</div>
        </div>
        <img class="lgr-source" src="https://cdn.trustindex.io/assets/platform/Google/icon.svg" alt="Google" width="20" height="20" />
      </header>
      ${starsHtml(r.rating)}
      <p class="lgr-text">${escapeHtml(r.text)}</p>
    </article>`;
}

function widgetHtml(data: Payload): string {
  const cards = data.reviews.map(reviewCard).join("");
  return `
    <section class="lgr-widget" dir="rtl">
      <header class="lgr-header">
        <img class="lgr-logo" src="https://cdn.trustindex.io/assets/platform/Google/logo.svg" alt="Google" width="120" height="20" />
        <div class="lgr-summary">
          <strong class="lgr-rating-num">${data.rating.toFixed(1)}</strong>
          ${starsHtml(data.rating)}
          <span class="lgr-total">מבוסס על ${data.total.toLocaleString("he-IL")} ביקורות</span>
        </div>
      </header>
      <div class="lgr-grid">${cards}</div>
    </section>`;
}

function updateRpiBadge(data: Payload) {
  const badge = document.querySelector("#rpi-6226-static .rpi-badge-cnt");
  if (!badge) return;
  const based = badge.querySelector(".rpi-based");
  if (based) based.textContent = `מבוסס על ${data.total.toLocaleString("he-IL")} ביקורות`;
  const stars = badge.querySelector(".rpi-stars") as HTMLElement | null;
  if (stars) {
    stars.style.setProperty("--rating", data.rating.toFixed(1));
    stars.textContent = data.rating.toFixed(1);
  }
}

let inflight: Promise<void> | null = null;

export function mountLiveGoogleReviews(root: Document | HTMLElement = document): void {
  // Find the trustindex widget container(s) on the page
  const targets = Array.from(
    root.querySelectorAll<HTMLElement>(".elementor-shortcode pre.ti-widget, .elementor-shortcode > pre.ti-widget"),
  );
  // Also match rendered ti-widget-container if trustindex already hydrated
  const rendered = Array.from(
    root.querySelectorAll<HTMLElement>(".ti-widget-container"),
  );
  const anchors: HTMLElement[] = [];
  if (targets.length) anchors.push(...targets);
  else if (rendered.length) anchors.push(...rendered);

  if (!anchors.length && !document.getElementById("rpi-6226-static")) return;

  if (inflight) return;
  inflight = (async () => {
    try {
      const res = await fetch("/api/public/google-reviews");
      if (!res.ok) return;
      const data = (await res.json()) as Payload;
      if (!data.reviews || !data.reviews.length) return;

      // Replace each trustindex widget with our own
      anchors.forEach((a) => {
        const wrap = document.createElement("div");
        wrap.className = "lgr-mount";
        wrap.innerHTML = widgetHtml(data);
        // Replace nearest .elementor-shortcode ancestor content if present
        const shortcode = a.closest(".elementor-shortcode") as HTMLElement | null;
        if (shortcode) {
          shortcode.innerHTML = "";
          shortcode.appendChild(wrap);
        } else {
          a.replaceWith(wrap);
        }
      });

      updateRpiBadge(data);
    } catch {
      // fallback: leave existing widget intact
    }
  })();
}