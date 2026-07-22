import Swiper from "swiper";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

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
  const widgets = root.querySelectorAll<HTMLElement>(".elementor-widget[data-settings]");
  widgets.forEach((widget) => {
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
    const wantArrows = nav === "arrows" || nav === "both";
    const wantDots = nav === "dots" || nav === "both";

    const modules = [] as unknown[];
    if (wantArrows) modules.push(Navigation);
    if (wantDots) modules.push(Pagination);
    if (s.autoplay === "yes") modules.push(Autoplay);

    const prevBtn = widget.querySelector<HTMLElement>(".elementor-swiper-button-prev");
    const nextBtn = widget.querySelector<HTMLElement>(".elementor-swiper-button-next");

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

    if (wantArrows && prevBtn && nextBtn) {
      config.navigation = { prevEl: prevBtn, nextEl: nextBtn };
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
  });
}

function hydrateLazyMedia(root: ParentNode) {
  const els = root.querySelectorAll<HTMLElement>("iframe[data-lazy-src], img[data-lazy-src]");
  els.forEach((el) => {
    const real = el.getAttribute("data-lazy-src");
    if (!real) return;
    const cur = el.getAttribute("src") ?? "";
    if (cur === "" || cur === "about:blank" || cur.startsWith("data:")) {
      el.setAttribute("src", real);
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
    const container = widget.querySelector<HTMLElement>(".elementor-widget-container") ?? widget;
    const controls = s.controls === "yes" ? "1" : "0";
    const wrap = document.createElement("div");
    wrap.className = "elementor-wrapper elementor-open-inline elementor-fit-aspect-ratio";
    wrap.style.position = "relative";
    wrap.style.width = "100%";
    wrap.style.aspectRatio = "16 / 9";
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${id}?controls=${controls}&rel=0`;
    iframe.title = "YouTube video";
    iframe.loading = "lazy";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    );
    iframe.style.position = "absolute";
    iframe.style.inset = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    wrap.appendChild(iframe);
    container.appendChild(wrap);
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
      } else {
        oc.classList.remove("elementor-active");
        oc.setAttribute("data-state", "closed");
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
  hydrateLazyMedia(root);
  injectVideos(root);
  initSwipers(root);
  setupOffCanvas(document);
  revealAnimations(root);
}