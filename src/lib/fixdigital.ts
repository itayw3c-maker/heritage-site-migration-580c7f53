// FixDigital SPA hydrator: tags phone elements and injects the loader script.
// (1) fixdigital_params and (2) cookie IIFE are set as inline <script> in <head>
// (see src/routes/__root.tsx). Here we run (3) tagging and (4) injector after
// each render / route change.

const PHONE_RE = /(?:^|\D)(0\d{1,2}[-\s]?\d{3}[-\s]?\d{4})(?:\D|$)/;

function isPhoneText(text: string | null | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  // Reject long strings that just happen to contain a number
  if (trimmed.length > 24) return false;
  return PHONE_RE.test(trimmed);
}

function tagPhoneElements(root: ParentNode = document): void {
  // tel: links
  root.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]').forEach((a) => {
    a.classList.add("fix_smartphone_href");
    if (isPhoneText(a.textContent)) a.classList.add("fix_smartphone");
  });

  // Non-link elements whose visible text is a phone number.
  // Scan leaf-ish elements (span, strong, em, p, div, li, td, h1-h6).
  const selector = "span, strong, em, b, p, li, td, h1, h2, h3, h4, h5, h6";
  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (el.closest("a[href^=\"tel:\"]")) return; // handled above
    if (el.classList.contains("fix_smartphone")) return;
    // Only tag elements whose text is essentially just the phone number.
    const text = (el.textContent || "").trim();
    if (!isPhoneText(text)) return;
    // Avoid containers with many children — only tag when text is direct.
    const hasElementChildren = Array.from(el.children).some(
      (c) => c.nodeType === 1
    );
    if (hasElementChildren) return;
    el.classList.add("fix_smartphone");
  });
}

// The integrate.js script is loaded synchronously in the initial <head>
// (see src/routes/__root.tsx RootShell) so that fixdigital_params is fully
// bound before add-view fires. Here we only (re)tag phone elements and ask
// the loaded script to re-scan after SPA route changes.
export function hydrateFixDigital(): void {
  if (typeof window === "undefined") return;
  tagPhoneElements(document);
  const w = window as any;
  try {
    w.fixdigital?.askPhone?.();
  } catch {
    /* noop */
  }
}