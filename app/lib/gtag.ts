// app/lib/gtag.ts
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function gaEvent(eventName: string, params: Record<string, any> = {}) {
  if (!GA_ID) return;
  if (typeof window === "undefined") return;

  const payload = {
    debug_mode: true,
    ...params,
  };

  // gtag があればそれで送る
  if (window.gtag) {
    window.gtag("event", eventName, payload);
    return;
  }

  // gtag が無い場合は dataLayer に push（GTM/一部の実装向け）
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(["event", eventName, payload]);
}
