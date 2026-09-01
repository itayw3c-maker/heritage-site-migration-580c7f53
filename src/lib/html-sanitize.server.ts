// Server-side HTML allowlist sanitizer for the publish pipeline.
// Runs before anything is persisted, so untrusted article HTML can never
// introduce scripts, inline event handlers or javascript: URLs into a page.
//
// Deliberately dependency-free: the Worker runtime bundles everything at
// build time and a hand-written tokenizer keeps the allowlist auditable.

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "span", "div", "section", "article", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "small", "sup", "sub", "abbr", "code", "pre",
  "blockquote", "cite", "q",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "a", "img", "picture", "source",
]);

// Tags whose *entire content* is dropped, not just the tag itself.
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "applet", "template",
  "noscript", "form", "input", "button", "select", "textarea", "svg", "math",
  "link", "meta", "base", "frame", "frameset", "audio", "video",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "col", "source"]);

const GLOBAL_ATTRS = new Set(["dir", "lang", "title", "id", "class", "role"]);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading", "decoding", "srcset", "sizes"]),
  source: new Set(["src", "srcset", "sizes", "type", "media"]),
  td: new Set(["colspan", "rowspan", "headers"]),
  th: new Set(["colspan", "rowspan", "scope", "headers"]),
  col: new Set(["span"]),
  colgroup: new Set(["span"]),
  ol: new Set(["start", "type"]),
  blockquote: new Set(["cite"]),
  q: new Set(["cite"]),
  abbr: new Set(["title"]),
};

const SAFE_URL = /^(?:https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i;

export interface SanitizeReport {
  html: string;
  removedTags: string[];
  removedAttributes: string[];
  blockedUrls: number;
}

function safeUrl(value: string): boolean {
  const v = value.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (v === "") return false;
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(v)) return true;
  if (/^[a-z0-9.+-]*script\s*:/i.test(v)) return false;
  return SAFE_URL.test(v);
}

function escapeText(text: string): string {
  return text.replace(/&(?![a-zA-Z#][a-zA-Z0-9]{0,30};)/g, "&amp;").replace(/</g, "&lt;");
}

/**
 * Sanitize untrusted article HTML against a tag/attribute allowlist.
 * Unknown tags are unwrapped (their text kept); dangerous tags are dropped
 * with their content; event handlers, style attributes, javascript:/data:
 * URLs and framing attributes are stripped.
 */
export function sanitizeArticleHtml(input: string): SanitizeReport {
  const removedTags = new Set<string>();
  const removedAttributes = new Set<string>();
  let blockedUrls = 0;
  let out = "";
  let i = 0;
  const openStack: string[] = [];

  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) {
      out += escapeText(input.slice(i));
      break;
    }
    out += escapeText(input.slice(i, lt));

    // comments / doctype / CDATA
    if (input.startsWith("<!--", lt)) {
      const end = input.indexOf("-->", lt + 4);
      i = end === -1 ? input.length : end + 3;
      continue;
    }
    if (input.startsWith("<!", lt) || input.startsWith("<?", lt)) {
      const end = input.indexOf(">", lt);
      i = end === -1 ? input.length : end + 1;
      continue;
    }

    const match = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>?/.exec(
      input.slice(lt),
    );
    if (!match) {
      out += "&lt;";
      i = lt + 1;
      continue;
    }
    const raw = match[0]!;
    const closing = match[1] === "/";
    const tag = match[2]!.toLowerCase();
    const attrText = match[3] ?? "";
    i = lt + raw.length;

    if (DROP_WITH_CONTENT.has(tag)) {
      removedTags.add(tag);
      if (!closing) {
        const closeRe = new RegExp(`<\\s*/\\s*${tag}\\s*>`, "i");
        const rest = input.slice(i);
        const m = closeRe.exec(rest);
        i = m ? i + m.index + m[0].length : input.length;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap unknown-but-harmless markup: keep inner text, drop the tag.
      removedTags.add(tag);
      continue;
    }

    if (closing) {
      const idx = openStack.lastIndexOf(tag);
      if (idx === -1) continue;
      openStack.splice(idx, 1);
      out += `</${tag}>`;
      continue;
    }

    const allowed = TAG_ATTRS[tag];
    const attrs: string[] = [];
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(attrText))) {
      const name = am[1]!.toLowerCase();
      let value = am[2] ?? "";
      if (value.startsWith('"') || value.startsWith("'")) value = value.slice(1, -1);
      if (name.startsWith("on") || name === "style" || name === "srcdoc" || name === "formaction") {
        removedAttributes.add(name);
        continue;
      }
      const isData = name.startsWith("data-") && !/["'<>]/.test(value);
      if (!GLOBAL_ATTRS.has(name) && !isData && !(allowed && allowed.has(name))) {
        removedAttributes.add(name);
        continue;
      }
      if (name === "href" || name === "src" || name === "cite" || name === "srcset") {
        const candidates = name === "srcset" ? value.split(",").map((s) => s.trim().split(/\s+/)[0] ?? "") : [value];
        if (candidates.some((c) => !safeUrl(c))) {
          blockedUrls++;
          removedAttributes.add(name);
          continue;
        }
      }
      const safeValue = value.replace(/&(?![a-zA-Z#][a-zA-Z0-9]{0,30};)/g, "&amp;").replace(/"/g, "&quot;");
      attrs.push(value === "" && !am[2] ? name : `${name}="${safeValue}"`);
    }

    if (tag === "a") {
      const hasHref = attrs.some((a) => a.startsWith("href="));
      if (hasHref && !attrs.some((a) => a.startsWith("rel="))) {
        attrs.push('rel="noopener noreferrer"');
      }
    }

    const selfClosing = VOID_TAGS.has(tag) || /\/\s*>?$/.test(raw);
    out += `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}${VOID_TAGS.has(tag) ? " /" : ""}>`;
    if (!selfClosing) openStack.push(tag);
  }

  while (openStack.length) out += `</${openStack.pop()}>`;

  return {
    html: out,
    removedTags: [...removedTags],
    removedAttributes: [...removedAttributes],
    blockedUrls,
  };
}

/** True when the payload contains markup we refuse outright. */
export function containsHardBlockedMarkup(input: string): boolean {
  return /<\s*script\b|javascript\s*:|\son[a-z]+\s*=|<\s*iframe\b|<\s*object\b|<\s*embed\b/i.test(
    input,
  );
}
