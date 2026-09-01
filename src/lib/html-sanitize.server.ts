// Server-side HTML allowlist sanitizer for the publish pipeline.
// Runs before anything is persisted, so untrusted article HTML can never
// introduce scripts, inline event handlers or javascript: URLs into a page.
//
// Parsing/serialisation is delegated to `sanitize-html`, which is built on the
// pure-JS htmlparser2 tokenizer (no DOM, no native bindings) and therefore
// bundles cleanly for the Worker runtime. This module only owns the explicit
// allowlist and the reporting shape — there is no hand-written parser and no
// regex-based "sanitisation" of markup.

import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "hr", "span", "div", "section", "article", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "small", "sup", "sub", "abbr", "code", "pre",
  "blockquote", "cite", "q",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "a", "img", "picture", "source",
];

// Tags whose *entire content* is dropped, not just the tag itself.
const DROP_WITH_CONTENT = [
  "script", "style", "iframe", "object", "embed", "applet", "template",
  "noscript", "form", "input", "button", "select", "textarea", "svg", "math",
  "link", "meta", "base", "frame", "frameset", "audio", "video",
];

const GLOBAL_ATTRS = ["dir", "lang", "title", "id", "class", "role"];

const TAG_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading", "decoding", "srcset", "sizes"],
  source: ["src", "srcset", "sizes", "type", "media"],
  td: ["colspan", "rowspan", "headers"],
  th: ["colspan", "rowspan", "scope", "headers"],
  col: ["span"],
  colgroup: ["span"],
  ol: ["start", "type"],
  blockquote: ["cite"],
  q: ["cite"],
  abbr: ["title"],
};

// Protocols allowed anywhere a URL attribute is accepted. `data:` is handled
// separately below so only base64 raster images pass.
const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];
const ALLOWED_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i;

export interface SanitizeReport {
  html: string;
  removedTags: string[];
  removedAttributes: string[];
  blockedUrls: number;
}

function buildAllowedAttributes(): Record<string, string[]> {
  const map: Record<string, string[]> = { "*": [...GLOBAL_ATTRS] };
  for (const [tag, attrs] of Object.entries(TAG_ATTRS)) map[tag] = [...attrs];
  return map;
}

/**
 * Sanitize untrusted article HTML against the explicit allowlist above.
 * Returns the safe HTML plus a report used for audit logging (counts only —
 * never the payload itself).
 */
export function sanitizeArticleHtml(input: unknown): SanitizeReport {
  if (typeof input !== "string" || input.trim() === "") {
    return { html: "", removedTags: [], removedAttributes: [], blockedUrls: 0 };
  }

  const removedTags = new Set<string>();
  const removedAttributes = new Set<string>();
  let blockedUrls = 0;

  const html = sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: buildAllowedAttributes(),
    // Anything not on the allowlist is removed; these lose their text too.
    nonTextTags: DROP_WITH_CONTENT,
    disallowedTagsMode: "discard",
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesAppliedToAttributes: ["href", "src", "cite", "srcset"],
    allowProtocolRelative: false,
    // Reject `data:` URLs entirely; base64 raster images are re-allowed in the
    // transform below after an explicit format check.
    allowedSchemesByTag: {},
    enforceHtmlBoundary: false,
    parser: { lowerCaseAttributeNames: true },
    exclusiveFilter: () => false,
    onOpenTag(name) {
      // Records what the allowlist rejected, for the audit trail.
      if (!ALLOWED_TAGS.includes(name)) removedTags.add(name);
    },
    transformTags: {
      "*": (tagName, attribs) => {
        const out: Record<string, string> = {};
        const allowed = new Set([...GLOBAL_ATTRS, ...(TAG_ATTRS[tagName] ?? [])]);
        for (const [rawName, rawValue] of Object.entries(attribs)) {
          const name = rawName.toLowerCase();
          if (!allowed.has(name)) {
            removedAttributes.add(name);
            continue;
          }
          const value = String(rawValue ?? "");
          if (name === "href" || name === "src" || name === "cite" || name === "srcset") {
            if (ALLOWED_DATA_IMAGE.test(value.trim())) {
              out[name] = value.trim();
              continue;
            }
            if (value.trim().toLowerCase().startsWith("data:")) {
              blockedUrls += 1;
              continue;
            }
          }
          out[name] = value;
        }
        if (tagName === "a" && out["href"]) {
          const href = out["href"];
          if (/^https?:\/\//i.test(href)) {
            out["rel"] = "noopener noreferrer";
          }
        }
        return { tagName, attribs: out };
      },
    },
  });

  // sanitize-html strips unsafe URLs silently; detect that so the audit log
  // reflects blocked links without inspecting the payload downstream.
  const inputUrlCount = (input.match(/\s(?:href|src|cite)\s*=/gi) ?? []).length;
  const outputUrlCount = (html.match(/\s(?:href|src|cite)\s*=/gi) ?? []).length;
  if (inputUrlCount > outputUrlCount) {
    blockedUrls += inputUrlCount - outputUrlCount;
  }

  return {
    html,
    removedTags: [...removedTags],
    removedAttributes: [...removedAttributes],
    blockedUrls,
  };
}

/**
 * Cheap pre-check used to reject obviously hostile payloads before the full
 * sanitize pass. This is a *detection* helper for the audit log and early 422s,
 * never the security boundary — `sanitizeArticleHtml` is.
 */
export function containsHardBlockedMarkup(input: unknown): boolean {
  if (typeof input !== "string") return false;
  return /<\s*(script|iframe|object|embed|form|svg|math|link|meta|base)\b/i.test(input);
}
