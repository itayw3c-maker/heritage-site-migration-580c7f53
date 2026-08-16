import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackEvent } from "@/lib/analytics";

export function GoogleAnalytics() {
  const location = useRouterState({ select: (state) => state.location });

  useEffect(() => {
    window.gtag?.("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: `${location.pathname}${location.searchStr || ""}`,
    });
  }, [location.pathname, location.searchStr]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) trackEvent("phone_click", { link_url: href });
      else if (/wa\.me|whatsapp/i.test(href)) trackEvent("whatsapp_click", { link_url: href });
      else if (href.startsWith("mailto:")) trackEvent("email_click", { link_url: href });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
