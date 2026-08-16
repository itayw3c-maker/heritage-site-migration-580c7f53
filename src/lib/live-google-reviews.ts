// Client-side live reviews carousel: replaces the trustindex widget with a
// pixel-accurate carousel that matches the Trustindex visual style.
// Uses a MutationObserver so it fires even if Trustindex's CDN loads late.

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

function starsHtml(rating: number, size: "sm" | "lg" = "sm"): string {
  const full = Math.round(rating);
  const cls = size === "lg" ? "crs-hstar" : "crs-star";
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += `<span class="${cls}${i < full ? " on" : ""}">★</span>`;
  }
  return out;
}

function reviewCard(r: Review, idx: number): string {
  const avatarHtml = r.profile_photo_url
    ? `<img class="crs-avatar" src="${escapeHtml(r.profile_photo_url)}" alt="${escapeHtml(r.author_name)}" loading="lazy" referrerpolicy="no-referrer">`
    : `<div class="crs-avatar crs-avatar-fallback">${escapeHtml(initials(r.author_name))}</div>`;

  return `
<div class="crs-slide" data-idx="${idx}">
  <div class="crs-card">
    <div class="crs-card-head">
      <img class="crs-gicon" src="https://cdn.trustindex.io/assets/platform/Google/icon.svg" alt="Google" width="20" height="20">
      <div class="crs-who">
        <div class="crs-name">${escapeHtml(r.author_name)}</div>
        <div class="crs-date">${escapeHtml(r.relative_time)}</div>
      </div>
      ${avatarHtml}
    </div>
    <div class="crs-stars">
      ${starsHtml(r.rating)}
      <span class="crs-check" title="ביקורת מאומתת">✓</span>
    </div>
    <div class="crs-body">
      <p class="crs-text">${escapeHtml(r.text)}</p>
      <button class="crs-more" type="button" onclick="
        var p=this.previousElementSibling;
        p.style.webkitLineClamp='unset';p.style.overflow='visible';
        this.style.display='none'
      ">קרא עוד</button>
    </div>
  </div>
</div>`;
}

function widgetHtml(data: Payload): string {
  const cards = data.reviews.map((r, i) => reviewCard(r, i)).join("\n");
  const total = data.total > 0 ? data.total.toLocaleString("he-IL") : "";
  const totalLine = total ? `<div class="crs-total">מבוסס על ${total} ביקורות</div>` : "";

  return `
<div class="crs-mount" dir="rtl">
  <div class="crs-widget-head">
    <div class="crs-rating-row">
      <span class="crs-rating-num">${data.rating.toFixed(1)}</span>
      <span class="crs-hstars">${starsHtml(data.rating, "lg")}</span>
    </div>
    ${totalLine}
    <img class="crs-glogo" src="https://cdn.trustindex.io/assets/platform/Google/logo.svg" alt="Google" width="100" height="34">
  </div>
  <div class="crs-outer" id="crs-outer">
    <button class="crs-btn crs-btn-prev" aria-label="הקודם" id="crs-prev">&#10094;</button>
    <div class="crs-viewport">
      <div class="crs-track" id="crs-track">${cards}</div>
    </div>
    <button class="crs-btn crs-btn-next" aria-label="הבא" id="crs-next">&#10095;</button>
  </div>
</div>
<script>
(function(){
  var track = document.getElementById('crs-track');
  if (!track) return;
  var slides = Array.from(track.querySelectorAll('.crs-slide'));
  var pos = 0;
  function visCount() {
    var w = window.innerWidth;
    return w <= 640 ? 1 : w <= 960 ? 2 : 3;
  }
  function maxPos() { return Math.max(0, slides.length - visCount()); }
  function update() {
    var slideW = slides[0] ? slides[0].offsetWidth + 16 : 0;
    // RTL: positive translateX moves track to the left (shows later slides)
    track.style.transform = 'translateX(' + (pos * slideW) + 'px)';
    document.getElementById('crs-prev').disabled = pos >= maxPos();
    document.getElementById('crs-next').disabled = pos <= 0;
  }
  document.getElementById('crs-prev').addEventListener('click', function(){
    if (pos < maxPos()) { pos++; update(); }
  });
  document.getElementById('crs-next').addEventListener('click', function(){
    if (pos > 0) { pos--; update(); }
  });
  window.addEventListener('resize', function(){ if (pos > maxPos()) pos = maxPos(); update(); });
  update();
})();
</script>`;
}

function updateRpiBadge(data: Payload) {
  const badge = document.querySelector("#rpi-6226-static .rpi-badge-cnt");
  if (!badge) return;
  const based = badge.querySelector(".rpi-based");
  if (based && data.total > 0)
    based.textContent = `מבוסס על ${data.total.toLocaleString("he-IL")} ביקורות`;
  const stars = badge.querySelector(".rpi-stars") as HTMLElement | null;
  if (stars) {
    stars.style.setProperty("--rating", data.rating.toFixed(1));
    stars.textContent = data.rating.toFixed(1);
  }
}

// Find and replace the Trustindex widget anchor element.
// Supports both pre-hydration (<pre class="ti-widget">) and
// post-hydration (.ti-widget-container) selectors.
function findAnchors(root: Document | HTMLElement): HTMLElement[] {
  const pre = Array.from(
    root.querySelectorAll<HTMLElement>(
      ".elementor-shortcode pre.ti-widget, .elementor-shortcode > pre.ti-widget",
    ),
  );
  if (pre.length) return pre;
  const rendered = Array.from(
    root.querySelectorAll<HTMLElement>(".ti-widget-container"),
  );
  return rendered;
}

function mountWidget(anchors: HTMLElement[], data: Payload) {
  anchors.forEach((a) => {
    const wrap = document.createElement("div");
    wrap.className = "crs-mount-wrapper";
    wrap.innerHTML = widgetHtml(data);
    const shortcode = a.closest(".elementor-shortcode") as HTMLElement | null;
    if (shortcode) {
      shortcode.innerHTML = "";
      shortcode.appendChild(wrap);
    } else {
      a.replaceWith(wrap);
    }
  });
  updateRpiBadge(data);
}

let fetched = false;
let fetchPromise: Promise<Payload | null> | null = null;

async function fetchData(): Promise<Payload | null> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/public/google-reviews");
      if (!res.ok) return null;
      const data = (await res.json()) as Payload;
      if (!data.reviews?.length) return null;
      return data;
    } catch {
      return null;
    }
  })();
  return fetchPromise;
}

export function mountLiveGoogleReviews(
  root: Document | HTMLElement = document,
): void {
  // Attempt immediate mount (if Trustindex already rendered)
  const anchors = findAnchors(root);
  if (anchors.length || document.getElementById("rpi-6226-static")) {
    if (!fetched) {
      fetched = true;
      fetchData().then((data) => {
        if (!data) return;
        const a2 = findAnchors(root);
        if (a2.length) mountWidget(a2, data);
      });
    }
  }

  // Also watch via MutationObserver so we catch Trustindex loading late
  if (typeof MutationObserver === "undefined") return;
  const observer = new MutationObserver(() => {
    const a = findAnchors(root);
    if (!a.length) return;
    observer.disconnect();
    if (fetched) return; // already handled above
    fetched = true;
    fetchData().then((data) => {
      if (!data) return;
      const a2 = findAnchors(root);
      if (a2.length) mountWidget(a2, data);
    });
  });
  const target = root instanceof Document ? root.body : root;
  if (target) {
    observer.observe(target, { childList: true, subtree: true });
    // Disconnect after 10s to avoid leaking
    setTimeout(() => observer.disconnect(), 10000);
  }
}
