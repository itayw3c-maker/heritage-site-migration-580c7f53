// Swiper (JS + CSS) is loaded on demand: most pages have no carousel at all,
// so keeping it out of the critical bundle removes ~150KB of parse/execute.
type SwiperBundle = {
  Swiper: typeof import("swiper").default;
  Navigation: unknown;
  Pagination: unknown;
  Autoplay: unknown;
};

let swiperBundle: Promise<SwiperBundle> | null = null;

function loadSwiper(): Promise<SwiperBundle> {
  if (!swiperBundle) {
    swiperBundle = Promise.all([
      import("swiper"),
      import("swiper/modules"),
      import("swiper/css"),
      import("swiper/css/navigation"),
      import("swiper/css/pagination"),
    ]).then(([core, mods]) => ({
      Swiper: core.default,
      Navigation: mods.Navigation,
      Pagination: mods.Pagination,
      Autoplay: mods.Autoplay,
    }));
  }
  return swiperBundle;
}

function parseSettings(el: Element): Record<string, unknown> | null {
  const raw = (el as HTMLElement).getAttribute("data-settings");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function numOr<T>(v: unknown, fallback: T): number | T {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function spacingOf(v: unknown): number | undefined {
  if (v && typeof v === "object" && "size" in (v as Record<string, unknown>)) {
    const s = (v as { size: unknown }).size;
    const n = typeof s === "number" ? s : Number(s);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function initSwipers(root: ParentNode) {
  // Swiper (~84KB + its per-carousel init) is the single heaviest bit of
  // main-thread JS on the home page. Load + initialise each carousel only when
  // it nears the viewport, so below-the-fold carousels don't block first load.
  const widgets = Array.from(
    root.querySelectorAll<HTMLElement>(".elementor-widget[data-settings]"),
  ).filter(
    (w) =>
      w.querySelector(".swiper, .swiper-container") &&
      !(w as HTMLElement & { _swiperObserved?: boolean })._swiperObserved,
  );
  if (!widgets.length) return;
  const mark = (w: HTMLElement) => {
    (w as HTMLElement & { _swiperObserved?: boolean })._swiperObserved = true;
  };
  if (typeof IntersectionObserver === "undefined") {
    widgets.forEach(mark);
    void loadSwiper().then((S) => widgets.forEach((w) => initOneSwiper(w, S)));
    return;
  }
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        const widget = entry.target as HTMLElement;
        void loadSwiper().then((S) => initOneSwiper(widget, S));
      });
    },
    { rootMargin: "300px 0px" },
  );
  widgets.forEach((w) => {
    mark(w);
    io.observe(w);
  });
}

function initOneSwiper(widget: HTMLElement, S: SwiperBundle) {
  const { Swiper, Navigation, Pagination, Autoplay } = S;
  {
    const swiperEl = widget.querySelector<HTMLElement>(".swiper, .swiper-container");
    if (!swiperEl) return;
    if ((swiperEl as HTMLElement & { _swiperInited?: boolean })._swiperInited) return;
    const s = parseSettings(widget);
    if (!s) return;

    const perView = numOr(s.slides_to_show, 1) as number;
    const perViewLaptop = numOr(s.slides_to_show_laptop, perView) as number;
    const perViewTablet = numOr(s.slides_to_show_tablet, perView) as number;
    const perViewMobile = numOr(s.slides_to_show_mobile, 1) as number;

    const nav = String(s.navigation ?? "");
    const pagKey = String(s.pagination ?? "");
    const wantArrows =
      nav === "arrows" || nav === "both" || s.arrows === "yes";
    const wantDots =
      nav === "dots" ||
      nav === "both" ||
      pagKey === "bullets" ||
      pagKey === "yes";

    const modules = [] as unknown[];
    if (wantArrows) modules.push(Navigation);
    if (wantDots) modules.push(Pagination);
    if (s.autoplay === "yes") modules.push(Autoplay);

    let prevBtn = widget.querySelector<HTMLElement>(".elementor-swiper-button-prev");
    let nextBtn = widget.querySelector<HTMLElement>(".elementor-swiper-button-next");

    // Image carousels that are horizontally scrollable but ship without any
    // affordance (no arrows, no dots) get injected arrows in the site's style,
    // so it's clear there is more content to scroll.
    const slideCount = swiperEl.querySelectorAll(".swiper-slide").length;
    let forceArrows = false;
    if (
      !prevBtn &&
      !nextBtn &&
      slideCount > 1 &&
      widget.classList.contains("elementor-widget-image-carousel")
    ) {
      const [p, n] = injectSwiperArrows(swiperEl);
      prevBtn = p;
      nextBtn = n;
      forceArrows = true;
    }

    let paginationEl = swiperEl.querySelector<HTMLElement>(".swiper-pagination");
    if (wantDots && !paginationEl) {
      paginationEl = document.createElement("div");
      paginationEl.className = "swiper-pagination";
      swiperEl.appendChild(paginationEl);
    }

    const spaceBetween =
      spacingOf(s.image_spacing_custom) ??
      spacingOf(s.image_spacing_custom_tablet) ??
      spacingOf(s.image_spacing_custom_mobile) ??
      0;

    const config: Record<string, unknown> = {
      modules,
      slidesPerView: perViewMobile,
      spaceBetween,
      loop: s.infinite === "yes",
      breakpoints: {
        768: { slidesPerView: perViewTablet },
        1024: { slidesPerView: perViewLaptop },
        1200: { slidesPerView: perView },
      },
    };

    if (s.autoplay === "yes") {
      config.autoplay = {
        delay: (numOr(s.autoplay_speed, 3000) as number) || 3000,
        disableOnInteraction: s.pause_on_interaction === "yes",
        pauseOnMouseEnter: s.pause_on_hover !== "no",
      };
    }

    if ((wantArrows || forceArrows) && prevBtn && nextBtn) {
      config.navigation = { prevEl: prevBtn, nextEl: nextBtn };
      if (forceArrows && !modules.includes(Navigation)) modules.push(Navigation);
    }
    if (wantDots && paginationEl) {
      config.pagination = { el: paginationEl, clickable: true };
    }

    try {
      new Swiper(swiperEl, config as never);
      (swiperEl as HTMLElement & { _swiperInited?: boolean })._swiperInited = true;
    } catch (e) {
      console.warn("swiper init failed", e);
    }
  }
}

function hydrateLazyMedia(root: ParentNode) {
  return hydrateLazyMediaImpl(root);
}

const CHEVRON_LEFT =
  '<svg aria-hidden="true" class="e-font-icon-svg e-eicon-chevron-left" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M646 125C629 125 613 133 604 142L308 442C296 454 292 471 292 487 292 504 296 521 308 533L604 854C617 867 629 875 646 875 663 875 679 871 692 858 704 846 713 829 713 812 713 796 708 779 692 767L438 487 692 225C700 217 708 204 708 187 708 171 704 154 692 142 675 129 663 125 646 125Z"></path></svg>';
const CHEVRON_RIGHT =
  '<svg aria-hidden="true" class="e-font-icon-svg e-eicon-chevron-right" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="M696 533C708 521 713 504 713 487 713 471 708 454 696 446L400 146C388 133 375 125 354 125 338 125 325 129 313 142 300 154 292 171 292 187 292 204 296 221 308 233L563 492 304 771C292 783 288 800 288 817 288 833 296 850 308 863 321 871 338 875 354 875 371 875 388 867 400 854L696 533Z"></path></svg>';

function injectSwiperArrows(swiperEl: HTMLElement): [HTMLElement, HTMLElement] {
  const make = (dir: "prev" | "next") => {
    const el = document.createElement("div");
    el.className = `elementor-swiper-button elementor-swiper-button-${dir} e-injected-swiper-button`;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", dir === "prev" ? "הקודם" : "הבא");
    el.innerHTML = dir === "prev" ? CHEVRON_LEFT : CHEVRON_RIGHT;
    return el;
  };
  const prev = make("prev");
  const next = make("next");
  swiperEl.appendChild(prev);
  swiperEl.appendChild(next);
  return [prev, next];
}

function hydrateLazyMediaImpl(root: ParentNode) {
  const els = root.querySelectorAll<HTMLElement>("iframe[data-lazy-src], img[data-lazy-src]");
  els.forEach((el) => {
    const real = el.getAttribute("data-lazy-src");
    if (!real) return;
    const cur = el.getAttribute("src") ?? "";
    if (cur === "" || cur === "about:blank" || cur.startsWith("data:")) {
      el.setAttribute("src", real);
    }
    const srcset = el.getAttribute("data-lazy-srcset");
    if (srcset) {
      const curSet = el.getAttribute("srcset") ?? "";
      if (curSet === "" || curSet.startsWith("data:")) el.setAttribute("srcset", srcset);
    }
    const sizes = el.getAttribute("data-lazy-sizes");
    if (sizes && !el.getAttribute("sizes")) el.setAttribute("sizes", sizes);
    el.removeAttribute("data-lazy-src");
    el.removeAttribute("data-lazy-srcset");
    el.removeAttribute("data-lazy-sizes");
  });
  cleanupBrokenImages(root);
  applyLoadingPriority(root);
}

// LCP hero — preloaded in the route head; must stay eager + high priority.
const LCP_IMAGE_HINT = "רפאל-שמאות-רכוש.webp";

// Only images in (or just below) the first viewport load eagerly; everything
// else falls back to native lazy loading so the initial payload stays small.
function applyLoadingPriority(root: ParentNode) {
  const apply = () => {
    const threshold = (typeof window !== "undefined" ? window.innerHeight : 800) * 1.5;
    root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const src = img.getAttribute("src") ?? "";
      if (src.includes(LCP_IMAGE_HINT) || decodeURIComponent(src).includes(LCP_IMAGE_HINT)) {
        img.setAttribute("loading", "eager");
        img.setAttribute("fetchpriority", "high");
        return;
      }
      const top = img.getBoundingClientRect().top;
      img.setAttribute("loading", top < threshold ? "eager" : "lazy");
    });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(apply);
  else apply();
}

// Remove leftover WP "Super Picture" lightbox placeholders (no runtime here) and
// any <img> with no usable source, which otherwise renders as a broken icon.
function cleanupBrokenImages(root: ParentNode) {
  root
    .querySelectorAll(
      "#super-picture-image-viewer, #super-picture-image-loading, #super-picture-image-min-box, img.super-picture-img-loading, img.super-picture-img-error",
    )
    .forEach((el) => el.remove());
  // Wrappers are removed only when they hold no real image.
  root.querySelectorAll(".super-picture-image-wrapper").forEach((el) => {
    if (!el.querySelector("img[src]:not([src=''])")) el.remove();
  });
  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if ((src === "" || src === "about:blank") && !img.getAttribute("data-lazy-src")) {
      img.remove();
    }
  });
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{6,})/);
  return m ? m[1] : null;
}

function injectVideos(root: ParentNode) {
  const widgets = root.querySelectorAll<HTMLElement>(
    ".elementor-widget-video[data-settings]",
  );
  widgets.forEach((widget) => {
    if (widget.querySelector("iframe")) return;
    const s = parseSettings(widget);
    if (!s) return;
    const url = String(s.youtube_url ?? "");
    const id = url ? extractYoutubeId(url) : null;
    if (!id) return;
    const controls = s.controls === "yes" ? "1" : "0";
    const iframe = document.createElement("iframe");
    iframe.className = "elementor-video-iframe";
    iframe.src = `https://www.youtube.com/embed/${id}?controls=${controls}&rel=0`;
    iframe.title = "YouTube video";
    iframe.loading = "lazy";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    );
    iframe.setAttribute(
      "style",
      "width:100%;height:100%;border:0;display:block",
    );
    const videoEl = widget.querySelector<HTMLElement>(".elementor-video");
    if (videoEl) {
      videoEl.replaceWith(iframe);
    } else {
      const fallback =
        widget.querySelector<HTMLElement>(".elementor-wrapper") ??
        widget.querySelector<HTMLElement>(".elementor-widget-container") ??
        widget;
      fallback.appendChild(iframe);
    }
  });
}

function isOffCanvasHref(href: string): "open" | "close" | null {
  try {
    const decoded = decodeURIComponent(href);
    if (decoded.includes("off_canvas:open")) return "open";
    if (decoded.includes("off_canvas:close")) return "close";
  } catch {
    /* noop */
  }
  return null;
}

function setupOffCanvas(root: Document | HTMLElement) {
  const key = "__offCanvasBound";
  const el = root as Document & { [k: string]: unknown };
  if (el[key]) return;
  el[key] = true;

  document.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const a = target.closest<HTMLAnchorElement>('a[href*="elementor-action"]');
    if (!a) return;
    const action = isOffCanvasHref(a.getAttribute("href") ?? "");
    if (!action) return;
    ev.preventDefault();
    const offCanvases = document.querySelectorAll<HTMLElement>(".elementor-widget-off-canvas");
    offCanvases.forEach((oc) => {
      if (action === "open") {
        oc.classList.add("elementor-active");
        oc.setAttribute("data-state", "open");
        oc.style.display = "";
        oc.querySelectorAll<HTMLElement>(".e-off-canvas").forEach((panel) => {
          panel.setAttribute("aria-hidden", "false");
          panel.removeAttribute("inert");
        });
      } else {
        oc.classList.remove("elementor-active");
        oc.setAttribute("data-state", "closed");
        oc.querySelectorAll<HTMLElement>(".e-off-canvas").forEach((panel) => {
          panel.setAttribute("aria-hidden", "true");
          panel.setAttribute("inert", "");
        });
      }
    });
    document.documentElement.classList.toggle("elementor-off-canvas-open", action === "open");
  });
}

function revealAnimations(root: ParentNode) {
  const els = root.querySelectorAll<HTMLElement>(".elementor-invisible");
  const reveal = (el: HTMLElement) => {
    const s = parseSettings(el) ?? {};
    const anim =
      (s._animation as string | undefined) ||
      (s.animation as string | undefined) ||
      "";
    const delayRaw =
      (s._animation_delay as number | string | undefined) ??
      (s.animation_delay as number | string | undefined);
    const delay = typeof delayRaw === "number" ? delayRaw : Number(delayRaw);
    const apply = () => {
      if (anim && anim !== "none") {
        el.classList.add("animated", anim);
      }
      el.classList.remove("elementor-invisible");
    };
    if (!Number.isNaN(delay) && delay > 0) {
      window.setTimeout(apply, delay);
    } else {
      apply();
    }
  };

  if (typeof IntersectionObserver === "undefined") {
    els.forEach(reveal);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target as HTMLElement);
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
  );

  els.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const inView =
      rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
      rect.bottom > 0;
    if (inView) {
      reveal(el);
    } else {
      io.observe(el);
    }
  });
}

export function enhanceElementor(root: ParentNode = document) {
  improveAccessibility(root);
  hydrateLazyMedia(root);
  injectVideos(root);
  hydrateRllYoutube(root);
  hydrateTikTokEmbeds(root);
  initSwipers(root);
  setupOffCanvas(document);
  revealAnimations(root);
  addSubmenuArrows(root);
  applyStickies(root);
  mountTrustindexLazy();
  mountMenuReviews();
  // The floating Google badge is now the React SocialRatingFloat widget
  // (badge + reviews modal); the old static rpi badge is not injected anymore.
  decodeCfEmails(root);
  setupLeadForms(document);
  animateCounters(root);
  setupAccordions(root);
  enhancePhoneInputs(root);
  hydrateGalleries(root);
  setupNestedTabs(root);
}

function improveAccessibility(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".elementor-swiper-button-prev").forEach((button) => {
    if (!button.getAttribute("aria-label")) button.setAttribute("aria-label", "הקודם");
  });
  root.querySelectorAll<HTMLElement>(".elementor-swiper-button-next").forEach((button) => {
    if (!button.getAttribute("aria-label")) button.setAttribute("aria-label", "הבא");
  });

  // Elementor exports carousel containers as ARIA lists even though their
  // direct children are wrappers rather than listitems. A named region models
  // the interaction accurately and avoids a malformed accessibility tree.
  root.querySelectorAll<HTMLElement>(".swiper[role='list']").forEach((swiper) => {
    swiper.setAttribute("role", "region");
    if (!swiper.getAttribute("aria-label")) swiper.setAttribute("aria-label", "קרוסלת תוכן");
  });

  root.querySelectorAll<HTMLAnchorElement>("a:not([aria-label])").forEach((link) => {
    const href = link.getAttribute("href") ?? "";
    const visibleName = `${link.textContent ?? ""} ${Array.from(link.querySelectorAll("img"))
      .map((img) => img.getAttribute("alt") ?? "")
      .join(" ")}`.trim();
    if (visibleName) return;
    let label = "";
    if (href.includes("elementor-action") && href.includes("off_canvas")) label = "פתיחת תפריט";
    else if (/instagram\.com/i.test(href)) label = "רפאל שמאות רכוש באינסטגרם";
    else if (/youtube\.com/i.test(href)) label = "רפאל שמאות רכוש ביוטיוב";
    else if (/tiktok\.com/i.test(href)) label = "רפאל שמאות רכוש בטיקטוק";
    else if (/facebook\.com/i.test(href)) label = "רפאל שמאות רכוש בפייסבוק";
    else if (/whatsapp\.com|wa\.me/i.test(href)) label = "יצירת קשר בוואטסאפ";
    if (label) link.setAttribute("aria-label", label);
  });
}

function setupNestedTabs(root: ParentNode) {
  const containers = root.querySelectorAll<HTMLElement>(".e-n-tabs");
  containers.forEach((tabs) => {
    const marked = tabs as HTMLElement & { _nestedTabsWired?: boolean };
    if (marked._nestedTabsWired) return;
    marked._nestedTabsWired = true;

    const titles = Array.from(tabs.querySelectorAll<HTMLElement>(".e-n-tab-title"));
    const panels = Array.from(tabs.querySelectorAll<HTMLElement>(".e-n-tabs-content > [role='tabpanel'], .e-n-tabs-content > .e-con"));
    if (!titles.length || !panels.length) return;

    const activate = (idx: number) => {
      titles.forEach((t, i) => {
        const on = i === idx;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        t.classList.toggle("e-active", on);
      });
      const activeId = titles[idx]?.getAttribute("aria-controls");
      panels.forEach((p) => {
        const on = p.id === activeId;
        p.classList.toggle("e-active", on);
        p.style.display = on ? "" : "none";
      });
      // Re-hydrate galleries inside the now-visible panel (backgrounds may need computed style).
      hydrateGalleries(tabs);
    };

    let initial = titles.findIndex((t) => t.getAttribute("aria-selected") === "true");
    if (initial < 0) initial = 0;
    activate(initial);

    titles.forEach((t, i) => {
      t.addEventListener("click", (e) => {
        e.preventDefault();
        activate(i);
      });
    });
  });
}

function hydrateGalleries(root: ParentNode) {
  const items = root.querySelectorAll<HTMLAnchorElement>(".elementor-gallery-item, .e-gallery-item");
  items.forEach((a) => {
    const marked = a as HTMLAnchorElement & { _galleryHydrated?: boolean };
    if (marked._galleryHydrated) return;
    const img = a.querySelector<HTMLElement>(".e-gallery-image, .elementor-gallery-item__image");
    if (!img) return;
    // Skip if a background-image is already set (inline or via CSS).
    const existingInline = img.style.backgroundImage;
    const existingCss = getComputedStyle(img).backgroundImage;
    if (!existingInline && existingCss && existingCss !== "none") {
      marked._galleryHydrated = true;
      return;
    }
    let url = img.getAttribute("data-thumbnail") || a.getAttribute("href") || "";
    if (!url) {
      const hash = a.getAttribute("data-e-action-hash") || "";
      const m = hash.match(/settings%3D([^%&]+)/i);
      if (m) {
        try {
          const json = atob(decodeURIComponent(m[1]));
          const data = JSON.parse(json);
          if (data && typeof data.url === "string") url = data.url;
        } catch {
          /* ignore */
        }
      }
    }
    if (!url) return;
    // Normalize absolute rrshamaut URLs to local paths.
    url = url.replace(/^https?:\/\/(?:www\.)?rrshamaut\.co\.il/i, "");
    // Normalize relative "../wp-content/..." → "/wp-content/...".
    url = url.replace(/^(?:\.\.\/)+wp-content\//, "/wp-content/");
    img.style.backgroundImage = `url("${url}")`;
    if (!img.style.backgroundSize) img.style.backgroundSize = "cover";
    if (!img.style.backgroundPosition) img.style.backgroundPosition = "center";
    // Provide an aspect ratio if the CSS didn't give the tile a height.
    if (getComputedStyle(img).height === "0px") {
      const w = parseFloat(img.getAttribute("data-width") || "");
      const h = parseFloat(img.getAttribute("data-height") || "");
      img.style.aspectRatio = w > 0 && h > 0 ? `${w} / ${h}` : "4 / 3";
      img.style.width = "100%";
    }
    marked._galleryHydrated = true;
  });
}

function enhancePhoneInputs(root: ParentNode) {
  const forms = root.querySelectorAll<HTMLFormElement>(".elementor-form");
  forms.forEach((form) => {
    const inputs = form.querySelectorAll<HTMLInputElement>("input");
    inputs.forEach((el) => {
      const name = (el.getAttribute("name") || "").toLowerCase();
      const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
      const isPhone =
        el.type === "tel" ||
        name.includes("phone") ||
        placeholder.includes("phone") ||
        name.includes("טלפון") ||
        placeholder.includes("טלפון") ||
        (el.getAttribute("placeholder") || "").includes("טלפון");
      if (!isPhone) return;
      const marked = el as HTMLInputElement & { _phoneEnhanced?: boolean };
      if (marked._phoneEnhanced) return;
      marked._phoneEnhanced = true;
      el.setAttribute("inputmode", "numeric");
      el.setAttribute("autocomplete", "tel");
      el.maxLength = 10;
      el.addEventListener("input", () => {
        const cleaned = el.value.replace(/\D/g, "").slice(0, 10);
        if (el.value !== cleaned) el.value = cleaned;
      });
    });
  });
}

function setupAccordions(root: ParentNode) {
  const accordions = root.querySelectorAll<HTMLElement>(".elementor-accordion");
  accordions.forEach((acc) => {
    if ((acc as HTMLElement & { _accInited?: boolean })._accInited) return;
    (acc as HTMLElement & { _accInited?: boolean })._accInited = true;
    const items = acc.querySelectorAll<HTMLElement>(".elementor-accordion-item");
    items.forEach((item) => {
      const title = item.querySelector<HTMLElement>(".elementor-tab-title");
      const content = item.querySelector<HTMLElement>(".elementor-tab-content");
      if (!title || !content) return;
      const isActive = title.classList.contains("elementor-active");
      title.setAttribute("aria-expanded", isActive ? "true" : "false");
      content.style.display = isActive ? "block" : "none";
      title.style.cursor = "pointer";
      title.addEventListener("click", (e) => {
        e.preventDefault();
        const open = title.classList.contains("elementor-active");
        // Close all siblings
        items.forEach((other) => {
          const oTitle = other.querySelector<HTMLElement>(".elementor-tab-title");
          const oContent = other.querySelector<HTMLElement>(".elementor-tab-content");
          if (!oTitle || !oContent) return;
          oTitle.classList.remove("elementor-active");
          oContent.classList.remove("elementor-active");
          oTitle.setAttribute("aria-expanded", "false");
          oContent.style.display = "none";
        });
        if (!open) {
          title.classList.add("elementor-active");
          content.classList.add("elementor-active");
          title.setAttribute("aria-expanded", "true");
          content.style.display = "block";
        }
      });
    });
  });
}

function cfDecode(hex: string): string {
  try {
    const r = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ r);
    }
    return out;
  } catch {
    return "";
  }
}

function decodeCfEmails(root: ParentNode) {
  const links = root.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/cdn-cgi/l/email-protection#"]',
  );
  links.forEach((a) => {
    if ((a as HTMLElement & { _cfDecoded?: boolean })._cfDecoded) return;
    const href = a.getAttribute("href") ?? "";
    const hash = href.split("#")[1] ?? "";
    const email = cfDecode(hash);
    if (!email) return;
    a.setAttribute("href", `mailto:${email}`);
    a.querySelectorAll<HTMLElement>("span.__cf_email__").forEach((s) => {
      s.replaceWith(document.createTextNode(email));
    });
    if (a.textContent && /\[email.*protected\]/i.test(a.textContent)) {
      a.textContent = email;
    }
    (a as HTMLElement & { _cfDecoded?: boolean })._cfDecoded = true;
  });
  const spans = root.querySelectorAll<HTMLElement>("span.__cf_email__[data-cfemail]");
  spans.forEach((s) => {
    const hex = s.getAttribute("data-cfemail") ?? "";
    const email = cfDecode(hex);
    if (!email) return;
    s.replaceWith(document.createTextNode(email));
  });
}

function hydrateRllYoutube(root: ParentNode) {
  const players = root.querySelectorAll<HTMLElement>("div.rll-youtube-player[data-id]");
  players.forEach((el) => {
    if ((el as HTMLElement & { _rllInited?: boolean })._rllInited) return;
    (el as HTMLElement & { _rllInited?: boolean })._rllInited = true;
    const id = el.getAttribute("data-id") ?? "";
    const alt = el.getAttribute("data-alt") ?? "";
    const query = el.getAttribute("data-query") ?? "";
    if (!id) return;
    if (el.children.length === 0) {
      const img = document.createElement("img");
      img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      img.alt = alt;
      img.loading = "lazy";
      const play = document.createElement("div");
      play.className = "play";
      el.appendChild(img);
      el.appendChild(play);
    }
    el.addEventListener("click", () => {
      const q = query ? `&${query}` : "";
      el.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1${q}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    });
  });
}

// TikTok embeds: loading many v2-embed iframes at once trips TikTok's rate
// limiting and random cards render "הסרטון לא זמין כרגע". Content ships them
// with data-tt-src; each iframe gets its real src only near the viewport, and
// loads are serialized with a small gap so the player bootstraps never race.
const ttQueue: HTMLIFrameElement[] = [];
let ttDraining = false;
function ttDrain() {
  if (ttDraining) return;
  ttDraining = true;
  const next = () => {
    const frame = ttQueue.shift();
    if (!frame) {
      ttDraining = false;
      return;
    }
    const src = frame.getAttribute("data-tt-src");
    if (src) {
      frame.setAttribute("src", src);
      frame.removeAttribute("data-tt-src");
    }
    window.setTimeout(next, 350);
  };
  next();
}

function hydrateTikTokEmbeds(root: ParentNode) {
  const frames = Array.from(
    root.querySelectorAll<HTMLIFrameElement>("iframe[data-tt-src]"),
  ).filter((f) => !(f as HTMLIFrameElement & { _ttObserved?: boolean })._ttObserved);
  if (!frames.length) return;
  frames.forEach((f) => {
    (f as HTMLIFrameElement & { _ttObserved?: boolean })._ttObserved = true;
  });
  if (typeof IntersectionObserver === "undefined") {
    ttQueue.push(...frames);
    ttDrain();
    return;
  }
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        ttQueue.push(entry.target as HTMLIFrameElement);
        ttDrain();
      });
    },
    { rootMargin: "400px 0px" },
  );
  frames.forEach((f) => io.observe(f));
  // Safety net: if IO never fires (all frames far below the fold and the user
  // jumps straight there, or IO is unavailable/broken), start loading whatever
  // is still pending after a quiet delay — the drain still spaces the loads.
  window.setTimeout(() => {
    frames.forEach((f) => {
      if (f.getAttribute("data-tt-src") && ttQueue.indexOf(f) === -1) {
        io.unobserve(f);
        ttQueue.push(f);
      }
    });
    ttDrain();
  }, 6000);
}

function addSubmenuArrows(root: ParentNode) {
  const items = root.querySelectorAll<HTMLElement>(".menu-item-has-children > a");
  items.forEach((a) => {
    if (a.querySelector(".sub-arrow")) return;
    a.classList.add("has-submenu");
    const span = document.createElement("span");
    span.className = "sub-arrow";
    span.innerHTML =
      '<svg aria-hidden="true" class="e-font-icon-svg e-fas-caret-down" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg"><path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"></path></svg>';
    a.appendChild(span);
  });
  setupSubmenuToggles(root);
}

function setupSubmenuToggles(root: ParentNode) {
  const parents = root.querySelectorAll<HTMLElement>("li.menu-item-has-children");
  parents.forEach((li) => {
    if ((li as HTMLElement & { _submenuBound?: boolean })._submenuBound) return;
    (li as HTMLElement & { _submenuBound?: boolean })._submenuBound = true;
    const sub = li.querySelector<HTMLElement>(":scope > ul.sub-menu");
    const link = li.querySelector<HTMLElement>(":scope > a");
    if (!sub || !link) return;
    link.setAttribute("aria-haspopup", "true");
    link.setAttribute("aria-expanded", "false");

    const open = () => {
      sub.style.display = "block";
      li.classList.add("submenu-open");
      link.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      sub.style.display = "";
      li.classList.remove("submenu-open");
      link.setAttribute("aria-expanded", "false");
    };
    const toggle = () => {
      if (li.classList.contains("submenu-open")) close();
      else open();
    };

    li.addEventListener("mouseenter", open);
    li.addEventListener("mouseleave", close);

    link.addEventListener("click", (e) => {
      const href = (link as HTMLAnchorElement).getAttribute("href") || "";
      // Toggle instead of navigating to placeholder hrefs
      if (!href || href === "#" || href.startsWith("#")) {
        e.preventDefault();
        toggle();
        return;
      }
      // On touch/small screens, first tap opens submenu instead of navigating
      if (window.matchMedia("(max-width: 1024px)").matches && !li.classList.contains("submenu-open")) {
        e.preventDefault();
        open();
      }
    });

    const arrow = link.querySelector<HTMLElement>(".sub-arrow");
    if (arrow) {
      arrow.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });
    }

    document.addEventListener("click", (e) => {
      if (!li.contains(e.target as Node)) close();
    });
  });
}

function applyStickies(root: ParentNode) {
  const els = root.querySelectorAll<HTMLElement>("[data-settings]");
  els.forEach((el) => {
    const s = parseSettings(el);
    if (!s) return;
    if (s.sticky !== "top") return;
    if ((el as HTMLElement & { _stickyApplied?: boolean })._stickyApplied) return;
    const stickyOn = Array.isArray((s as { sticky_on?: unknown }).sticky_on)
      ? ((s as { sticky_on: string[] }).sticky_on)
      : null;
    if (stickyOn && stickyOn.length === 0) return;
    el.style.position = "sticky";
    const offsetRaw = (s as { sticky_offset?: unknown }).sticky_offset;
    const offset =
      typeof offsetRaw === "number"
        ? offsetRaw
        : typeof offsetRaw === "string" && offsetRaw.trim() !== ""
          ? Number(offsetRaw) || 0
          : 120;
    el.style.top = `${offset}px`;
    el.style.zIndex = "99";
    // Unblock ancestors: position:sticky is killed by any ancestor with
    // overflow other than visible. Walk up to <body> and neutralize inline
    // overflow only on ancestors that currently clip.
    let p: HTMLElement | null = el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const cs = window.getComputedStyle(p);
      if (
        cs.overflow !== "visible" ||
        cs.overflowX !== "visible" ||
        cs.overflowY !== "visible"
      ) {
        p.style.overflow = "visible";
      }
      p = p.parentElement;
    }
    (el as HTMLElement & { _stickyApplied?: boolean })._stickyApplied = true;
  });
}

// Third-party reviews widget: keep it off the initial critical path. It mounts
// when the reviews section approaches the viewport, or on idle after load.
function mountTrustindexLazy() {
  const tpl = document.getElementById("trustindex-google-widget-html");
  if (!tpl) return;
  const marked = tpl as HTMLElement & { _tiLazyWired?: boolean };
  if (marked._tiLazyWired) return;
  marked._tiLazyWired = true;

  // The template itself lives inside a display:none container, which never
  // intersects — observe the visible carrier <div> instead.
  let target =
    document.querySelector<HTMLElement>('div[data-src*="loader.js"]') ?? null;
  if (!target) {
    let p = tpl.parentElement;
    while (p && getComputedStyle(p).display === "none") p = p.parentElement;
    target = (p ?? document.body) as HTMLElement;
  }
  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    mountTrustindex();
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fire();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(target);
    return;
  }

  const idle = () => {
    const w = window as unknown as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(fire, { timeout: 5000 });
    else w.setTimeout(fire, 3000);
  };
  if (document.readyState === "complete") idle();
  else (window as unknown as Window).addEventListener("load", idle, { once: true });
}

function mountTrustindex() {
  const tpl = document.getElementById(
    "trustindex-google-widget-html",
  ) as HTMLTemplateElement | null;
  if (!tpl) return;

  const cssHref =
    "/wp-content/uploads/trustindex-google-widget.css?1783314896";
  if (!document.querySelector(`link[href="${cssHref}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssHref;
    document.head.appendChild(link);
  }

  // Load the loader script itself once, WITHOUT a query string so the loader
  // skips it as a widget candidate and just renders the carrier <div> above.
  if (!document.querySelector("script[data-ti-loader]")) {
    const s = document.createElement("script");
    s.setAttribute("data-ti-loader", "1");
    s.src = "/cdn.trustindex.loader.js";
    s.async = true;
    document.body.appendChild(s);
  }
}


function mountRpiBadge() {
  if (document.getElementById("rpi-6226-static")) return;
  const div = document.createElement("div");
  div.id = "rpi-6226-static";
  div.className = "rpi";
  div.setAttribute("data-id", "6226");
  div.innerHTML =
    '<div class="rpi-badge-cnt rpi-badge-right"><div class="rpi-badge" data-id="ChIJRSmMi4xWVSURJZWuczwr72w" data-provider="google" style="display:inline-block"><div class="rpi-badge-line"></div><a class="rpi-badge-body rpi-flex rpi-badge-clickable" href="https://search.google.com/local/reviews?placeid=ChIJRSmMi4xWVSURJZWuczwr72w" target="_blank" rel="nofollow noopener" style="text-decoration:none;color:inherit"><div class="rpi-logo rpi-logo-google"></div><div class="rpi-info"><div class="rpi-name">Google ג גוגל</div><span class="rpi-stars" style="--rating:5.0">5.0</span><div class="rpi-based">מבוסס על 520 ביקורות</div></div></a></div></div>';
  document.body.appendChild(div);
}

// Reviews badge inside the mobile off-canvas menu footer. Tapping it opens the
// React ReviewsModal (owned by SocialRatingFloat) via a window event. Idempotent.
function mountMenuReviews() {
  const content = document.querySelector<HTMLElement>(".e-off-canvas__content");
  if (!content) return;
  if (content.querySelector(".rr-menu-reviews")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "rr-menu-reviews";
  btn.setAttribute("aria-label", "דירוג 5.0 בגוגל, 520 ביקורות — פתיחת הביקורות");
  btn.innerHTML =
    '<span class="rr-menu-reviews__g"><svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.4 6.64v5.52h7.11c4.16-3.83 6.57-9.47 6.57-16.17z"></path><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.55-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.44 2.1-5.73 0-10.58-3.87-12.3-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"></path><path fill="#FBBC05" d="M11.7 28.18A13.4 13.4 0 0 1 11 24c0-1.45.25-2.86.7-4.18v-5.7H4.34A21.9 21.9 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.36-5.7z"></path><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.36 5.7c1.72-5.2 6.57-9.07 12.3-9.07z"></path></svg></span>' +
    '<span class="rr-menu-reviews__txt"><span class="rr-menu-reviews__top"><b>5.0</b><span class="rr-menu-reviews__stars">★★★★★</span></span><small>520 ביקורות בגוגל</small></span>';
  btn.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("rr:open-reviews"));
  });
  let target: HTMLElement = content;
  const socialUl = content.querySelector("ul.elementor-icon-list-items");
  if (socialUl) {
    const w = socialUl.closest<HTMLElement>(".elementor-widget");
    if (w && w.parentElement) target = w.parentElement;
  } else {
    const econ = content.querySelector<HTMLElement>(".e-con");
    if (econ) target = econ;
  }
  target.appendChild(btn);
}
// ---------------- Lead form submission ----------------

export type FormPayload = {
  name: string;
  phone: string;
  email: string | null;
  damage_type: string | null;
  message: string | null;
  page_url: string;
  form_name: string;
};

function classifyField(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): keyof FormPayload | null {
  const name = (el.getAttribute("name") ?? "").toLowerCase();
  const type = ((el as HTMLInputElement).type ?? el.tagName.toLowerCase()).toLowerCase();
  const placeholder = ((el as HTMLInputElement).placeholder ?? "").toLowerCase();
  if (type === "hidden" || type === "submit" || type === "button") return null;
  if (type === "checkbox" || type === "radio") return null;
  if (type === "tel" || /phone|טלפון/.test(name + " " + placeholder)) return "phone";
  if (type === "email" || /email|אימייל|מייל/.test(name + " " + placeholder)) return "email";
  if (el.tagName.toLowerCase() === "select") return "damage_type";
  if (
    el.tagName.toLowerCase() === "textarea" ||
    /message|הודעה/.test(name + " " + placeholder)
  )
    return "message";
  return "name";
}

function showFormMessage(
  form: HTMLFormElement,
  kind: "danger" | "success",
  text: string,
) {
  form.querySelectorAll(".elementor-message.rr-injected").forEach((m) => m.remove());
  const div = document.createElement("div");
  div.className = `elementor-message elementor-message-${kind} rr-injected`;
  div.setAttribute("role", kind === "danger" ? "alert" : "status");
  div.textContent = text;
  form.insertBefore(div, form.firstChild);
}

function markInvalid(el: Element, invalid: boolean) {
  if (invalid) el.classList.add("rr-field-error");
  else el.classList.remove("rr-field-error");
}

/**
 * Sends a validated lead through the full pipeline: Supabase `leads` insert,
 * FixDigital attribution POST, and the email notification server fn.
 * Shared by the Elementor form handler (submitLead) and the React forms
 * (e.g. the water-damage calculator) so the pipeline lives in one place.
 * Throws if the Supabase insert fails; FixDigital / notify failures are
 * swallowed (best-effort) so a lead is never lost to a side-channel error.
 */
export async function sendLeadPayload(payload: FormPayload): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.from("leads").insert(payload);
  if (error) throw error;
  // Send lead to FixDigital.
  // NOTE on api_type=8: the integrate.js script only assigns self.leadUrl
  // when api_type is 3 or 4, so window.fixdigital.sendLead posts to
  // "undefined?…" and silently fails. We POST directly to add-lead-form
  // and attach the tracking context (channelID/viewID from the cookies
  // the script wrote) so the lead is attributed to the right channel.
  try {
    const getCookie = (name: string): string => {
      const m = document.cookie.match(
        new RegExp("(?:^|; )" + name.replace(/\./g, "\\.") + "=([^;]*)"),
      );
      return m ? decodeURIComponent(m[1]) : "";
    };
    const w = window as unknown as {
      fixdigital_params?: {
        api_clientkey?: string;
        api_tenantkey?: string;
        api_projectid?: string;
        api_projecttypeid?: string;
        api_type?: number | string;
      };
    };
    const params = w.fixdigital_params ?? {};
    const fd = new FormData();
    fd.append("channelID", getCookie("fixdigital.origin_channeld") || "");
    fd.append("viewID", getCookie("fixdigital.origin_viewid") || "");
    fd.append("original_referrer", getCookie("fixdigital.origin_referer") || "");
    fd.append("referrer", getCookie("fixdigital.referer") || "");
    fd.append("visitorID", getCookie("fixdigital.origin_visitorid") || "");
    fd.append("clientID", params.api_clientkey ?? "");
    fd.append("tenantID", params.api_tenantkey ?? "");
    fd.append("projectID", params.api_projectid ?? "");
    fd.append("projectTypeID", params.api_projecttypeid ?? "");
    fd.append("apitype", String(params.api_type ?? ""));
    fd.append("pageUrl", payload.page_url);
    fd.append("formUrl", payload.page_url);
    // Lead fields
    fd.append("name", payload.name);
    fd.append("phone", payload.phone);
    if (payload.email) fd.append("email", payload.email);
    if (payload.damage_type) fd.append("damage_type", payload.damage_type);
    if (payload.message) fd.append("message", payload.message);
    fd.append("source", payload.form_name);
    // keepalive so navigation right after doesn't abort the request
    await fetch("https://api.fixdigital.co.il/add-lead-form", {
      method: "POST",
      body: fd,
      mode: "no-cors",
      keepalive: true,
    }).catch((e) => console.warn("fixdigital lead POST failed", e));
  } catch (e) {
    console.warn("fixdigital lead failed", e);
  }
  try {
    const { notifyLead } = await import("@/lib/leads.functions");
    // Await so the request completes before we navigate (fetch would abort).
    // Cap so a slow send never blocks the UX.
    await Promise.race([
      notifyLead({ data: payload }),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
  } catch (e) {
    console.warn("lead email notify failed", e);
  }
}

async function submitLead(form: HTMLFormElement) {
  const fields = form.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input, textarea, select");

  const payload: FormPayload = {
    name: "",
    phone: "",
    email: null,
    damage_type: null,
    message: null,
    page_url: typeof window !== "undefined" ? window.location.href : "",
    form_name:
      form.getAttribute("name") ||
      form.getAttribute("data-form-name") ||
      "elementor-form",
  };

  let acceptanceRequired = false;
  let acceptanceChecked = true;
  let acceptanceEl: HTMLInputElement | null = null;

  fields.forEach((el) => {
    if (
      el instanceof HTMLInputElement &&
      el.classList.contains("elementor-acceptance-field")
    ) {
      if (el.required) {
        acceptanceRequired = true;
        acceptanceChecked = el.checked;
        acceptanceEl = el;
      }
      return;
    }
    const key = classifyField(el);
    if (!key) return;
    let val = (el.value ?? "").trim();
    if (el instanceof HTMLSelectElement) {
      const placeholderVal = el.options[0]?.value ?? "";
      if (val === placeholderVal) val = "";
    }
    if (!val) return;
    if (key === "email" || key === "damage_type" || key === "message") {
      (payload as Record<string, string | null>)[key] = val;
    } else if (!payload[key]) {
      (payload as Record<string, string>)[key] = val;
    }
  });

  const errors: string[] = [];
  const nameField = Array.from(fields).find((el) => classifyField(el) === "name");
  const phoneField = Array.from(fields).find((el) => classifyField(el) === "phone");
  if (!payload.name) {
    errors.push("יש להזין שם מלא");
    if (nameField) markInvalid(nameField, true);
  } else if (nameField) markInvalid(nameField, false);
  const phoneDigits = (payload.phone || "").replace(/\D/g, "");
  if (!payload.phone) {
    errors.push("יש להזין מספר טלפון");
    if (phoneField) markInvalid(phoneField, true);
  } else if (phoneDigits.length !== 10) {
    errors.push("מספר הטלפון חייב להכיל בדיוק 10 ספרות");
    if (phoneField) markInvalid(phoneField, true);
  } else {
    payload.phone = phoneDigits;
    if (phoneField) markInvalid(phoneField, false);
  }
  if (acceptanceRequired && !acceptanceChecked) {
    errors.push("יש לאשר את תנאי השימוש");
    if (acceptanceEl) markInvalid(acceptanceEl, true);
  } else if (acceptanceEl) markInvalid(acceptanceEl, false);

  if (errors.length) {
    showFormMessage(form, "danger", errors.join(" • "));
    return;
  }

  const submitBtn = form.querySelector<HTMLButtonElement>(
    'button[type="submit"], input[type="submit"]',
  );
  const prevDisabled = submitBtn?.disabled;
  if (submitBtn) submitBtn.disabled = true;

  try {
    await sendLeadPayload(payload);
    const { trackEvent } = await import("@/lib/analytics");
    trackEvent("generate_lead", { form_name: payload.form_name });
    window.location.href = "/thank-you/";
  } catch (err) {
    console.error("lead submit failed", err);
    showFormMessage(
      form,
      "danger",
      "אירעה שגיאה בשליחת הטופס. אנא נסו שוב או צרו קשר טלפונית.",
    );
    if (submitBtn) submitBtn.disabled = prevDisabled ?? false;
  }
}

function setupLeadForms(doc: Document) {
  const key = "__leadFormsBound";
  const d = doc as Document & { [k: string]: unknown };
  if (d[key]) return;
  d[key] = true;
  doc.addEventListener(
    "submit",
    (ev) => {
      const target = ev.target as HTMLElement | null;
      if (!target || !(target instanceof HTMLFormElement)) return;
      if (!target.classList.contains("elementor-form")) return;
      ev.preventDefault();
      ev.stopPropagation();
      void submitLead(target);
    },
    true,
  );
}

// ---------------- Counter animation ----------------

function formatWithDelimiter(n: number, delimiter: string): string {
  const s = Math.round(n).toString();
  if (!delimiter) return s;
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, delimiter);
}

function runCounter(el: HTMLElement) {
  if ((el as HTMLElement & { _counted?: boolean })._counted) return;
  (el as HTMLElement & { _counted?: boolean })._counted = true;

  const from = Number(el.getAttribute("data-from-value") ?? "0") || 0;
  const to = Number(el.getAttribute("data-to-value") ?? "0") || 0;
  const duration =
    Number(el.getAttribute("data-duration") ?? "2000") || 2000;
  const delimiter = el.getAttribute("data-delimiter") ?? ",";

  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    // jQuery swing easing (Elementor default)
    const eased = 0.5 - Math.cos(t * Math.PI) / 2;
    const val = from + (to - from) * eased;
    el.textContent = formatWithDelimiter(val, delimiter);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = formatWithDelimiter(to, delimiter);
  };
  requestAnimationFrame(step);
}

function animateCounters(root: ParentNode) {
  const nodes = root.querySelectorAll<HTMLElement>(
    ".elementor-counter-number[data-to-value]",
  );
  if (nodes.length === 0) return;

  const observe = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vh && rect.bottom > 0) {
      runCounter(el);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      runCounter(el);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runCounter(entry.target as HTMLElement);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    io.observe(el);
  };

  nodes.forEach((el) => {
    if ((el as HTMLElement & { _counted?: boolean })._counted) return;
    observe(el);
  });
}
