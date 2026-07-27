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
  hydrateRllYoutube(root);
  initSwipers(root);
  setupOffCanvas(document);
  revealAnimations(root);
  addSubmenuArrows(root);
  applyStickies(root);
  mountTrustindex();
  mountRpiBadge();
  decodeCfEmails(root);
  setupLeadForms(document);
  animateCounters(root);
  setupAccordions(root);
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
    el.style.top = "0px";
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
// ---------------- Lead form submission ----------------

type FormPayload = {
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
  if (!payload.phone) {
    errors.push("יש להזין מספר טלפון");
    if (phoneField) markInvalid(phoneField, true);
  } else if (phoneField) markInvalid(phoneField, false);
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
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.from("leads").insert(payload);
    if (error) throw error;
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
