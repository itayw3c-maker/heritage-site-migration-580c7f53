// Client-side Google reviews carousel that replaces the Trustindex widget.
// Built from real DOM nodes (never innerHTML + <script>, which never executes)
// and mounted via a MutationObserver so it also fires when Trustindex's CDN
// renders late and would otherwise overwrite us.

import { SEED_REVIEWS, SEED_RATING, SEED_TOTAL, type Review } from "./google-reviews-seed";

type Payload = {
  rating: number;
  total: number;
  reviews: Review[];
};

const GAP = 24;
const GOOGLE_ICON = "https://cdn.trustindex.io/assets/platform/Google/icon.svg";
const GOOGLE_LOGO = "https://cdn.trustindex.io/assets/platform/Google/logo.svg";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
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

function starsRow(rating: number, cls: string): HTMLElement {
  const wrap = el("span", cls);
  const full = Math.round(rating);
  for (let i = 0; i < 5; i++) {
    wrap.appendChild(el("span", i < full ? "crs-star on" : "crs-star", "★"));
  }
  return wrap;
}

function initialsAvatar(r: Review): HTMLElement {
  return el("div", "crs-avatar crs-avatar-fallback", initials(r.author_name));
}

function avatar(r: Review): HTMLElement {
  if (!r.profile_photo_url) return initialsAvatar(r);
  const img = el("img", "crs-avatar");
  img.src = r.profile_photo_url;
  img.alt = r.author_name;
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.addEventListener("error", () => img.replaceWith(initialsAvatar(r)), { once: true });
  return img;
}

function reviewCard(r: Review): HTMLElement {
  const slide = el("div", "crs-slide");
  const card = el("div", "crs-card");

  const head = el("div", "crs-card-head");
  const gicon = el("img", "crs-gicon");
  gicon.src = GOOGLE_ICON;
  gicon.alt = "Google";
  gicon.width = 22;
  gicon.height = 22;
  gicon.loading = "lazy";

  const who = el("div", "crs-who");
  who.appendChild(el("div", "crs-name", r.author_name));
  who.appendChild(el("div", "crs-date", r.relative_time));

  // RTL flex order: first child renders rightmost. Avatar right, G icon left.
  head.appendChild(avatar(r));
  head.appendChild(who);
  head.appendChild(gicon);

  const stars = el("div", "crs-stars");
  const check = el("span", "crs-check");
  check.title = "ביקורת מאומתת";
  check.setAttribute("role", "img");
  check.setAttribute("aria-label", "ביקורת מאומתת");
  stars.appendChild(check);
  stars.appendChild(starsRow(r.rating, "crs-starlist"));

  const body = el("div", "crs-body");
  const text = el("p", "crs-text", r.text);
  body.appendChild(text);

  card.appendChild(head);
  card.appendChild(stars);
  card.appendChild(body);

  requestAnimationFrame(() => {
    if (text.scrollHeight > text.clientHeight + 2) {
      const more = el("button", "crs-more", "קרא עוד");
      more.type = "button";
      more.addEventListener("click", () => {
        text.classList.add("crs-text-open");
        more.remove();
      });
      body.appendChild(more);
    }
  });

  slide.appendChild(card);
  return slide;
}

function header(data: Payload): HTMLElement {
  const head = el("div", "crs-widget-head");
  head.appendChild(starsRow(data.rating, "crs-hstars"));
  if (data.total > 0) {
    head.appendChild(
      el("div", "crs-total", `מבוסס על ${data.total.toLocaleString("he-IL")} ביקורות`),
    );
  }
  const logo = el("img", "crs-glogo");
  logo.src = GOOGLE_LOGO;
  logo.alt = "Google";
  logo.width = 180;
  logo.height = 60;
  head.appendChild(logo);
  return head;
}

function wireCarousel(
  track: HTMLElement,
  prev: HTMLButtonElement,
  next: HTMLButtonElement,
  count: number,
) {
  let pos = 0;

  const visible = () => {
    const w = window.innerWidth;
    return w <= 640 ? 1 : w <= 1024 ? 2 : 3;
  };
  const maxPos = () => Math.max(0, count - visible());

  const render = () => {
    const slide = track.firstElementChild as HTMLElement | null;
    const step = slide ? slide.offsetWidth + GAP : 0;
    track.style.transform = `translateX(${pos * step}px)`;
    prev.disabled = pos <= 0;
    next.disabled = pos >= maxPos();
  };

  prev.addEventListener("click", () => {
    if (pos > 0) {
      pos--;
      render();
    }
  });
  next.addEventListener("click", () => {
    if (pos < maxPos()) {
      pos++;
      render();
    }
  });
  window.addEventListener("resize", () => {
    if (pos > maxPos()) pos = maxPos();
    render();
  });

  requestAnimationFrame(render);
}

function buildWidget(data: Payload): HTMLElement {
  const mount = el("div", "crs-mount");
  mount.dir = "rtl";
  mount.appendChild(header(data));

  const outer = el("div", "crs-outer");
  const viewport = el("div", "crs-viewport");
  const track = el("div", "crs-track");
  data.reviews.forEach((r) => track.appendChild(reviewCard(r)));
  viewport.appendChild(track);

  const prev = el("button", "crs-btn crs-prev", "❯");
  prev.type = "button";
  prev.setAttribute("aria-label", "ביקורות קודמות");
  const next = el("button", "crs-btn crs-next", "❮");
  next.type = "button";
  next.setAttribute("aria-label", "ביקורות הבאות");

  outer.appendChild(viewport);
  outer.appendChild(prev);
  outer.appendChild(next);
  mount.appendChild(outer);

  wireCarousel(track, prev, next, data.reviews.length);
  return mount;
}

function updateRpiBadge(data: Payload) {
  const badge = document.querySelector("#rpi-6226-static .rpi-badge-cnt");
  if (!badge) return;
  const based = badge.querySelector(".rpi-based");
  if (based && data.total > 0) {
    based.textContent = `מבוסס על ${data.total.toLocaleString("he-IL")} ביקורות`;
  }
  const stars = badge.querySelector(".rpi-stars") as HTMLElement | null;
  if (stars) {
    stars.style.setProperty("--rating", data.rating.toFixed(1));
    stars.textContent = data.rating.toFixed(1);
  }
}

function findAnchors(root: Document | HTMLElement): HTMLElement[] {
  const pre = Array.from(
    root.querySelectorAll<HTMLElement>(".elementor-shortcode pre.ti-widget"),
  );
  if (pre.length) return pre;
  return Array.from(root.querySelectorAll<HTMLElement>(".ti-widget-container"));
}

function mountWidget(anchors: HTMLElement[], data: Payload) {
  anchors.forEach((a) => {
    const shortcode = a.closest(".elementor-shortcode") as HTMLElement | null;
    const host = shortcode ?? a;
    host.replaceChildren(buildWidget(data));
  });
  updateRpiBadge(data);
}

const FALLBACK: Payload = {
  rating: SEED_RATING,
  total: SEED_TOTAL,
  reviews: SEED_REVIEWS,
};

let fetchPromise: Promise<Payload> | null = null;

function fetchData(): Promise<Payload> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/public/google-reviews");
      if (!res.ok) return FALLBACK;
      const data = (await res.json()) as Payload;
      if (!data.reviews?.length) return FALLBACK;
      return data;
    } catch {
      return FALLBACK;
    }
  })();
  return fetchPromise;
}

let mounted = false;

function tryMount(root: Document | HTMLElement): boolean {
  if (mounted) return true;
  const anchors = findAnchors(root);
  if (!anchors.length) return false;
  mounted = true;
  fetchData().then((data) => {
    const live = findAnchors(root);
    mountWidget(live.length ? live : anchors, data);
  });
  return true;
}

export function mountLiveGoogleReviews(root: Document | HTMLElement = document): void {
  if (tryMount(root)) return;
  if (typeof MutationObserver === "undefined") return;

  const target = root instanceof Document ? root.body : root;
  if (!target) return;

  const observer = new MutationObserver(() => {
    if (tryMount(root)) observer.disconnect();
  });
  observer.observe(target, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
}
