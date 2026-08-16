type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

export function grantAnalyticsConsent() {
  if (typeof window === "undefined") return;
  window.gtag?.("consent", "update", { analytics_storage: "granted" });
}
