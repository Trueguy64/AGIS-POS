import { useEffect, useRef, useState } from "react";

type PayPalNamespace = { Buttons(o: { createOrder: () => string; onApprove: () => Promise<void>; onError: (e: unknown) => void }): { render(el: HTMLElement): Promise<void>; close(): void } };
declare global { interface Window { paypal?: PayPalNamespace } }

/** Loads the JS SDK once per client id + currency (the currency must match the order's, or the button fails). */
function loadSdk(clientId: string, currency: string): Promise<PayPalNamespace> {
  const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture`;
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing && window.paypal) return Promise.resolve(window.paypal);
  document.querySelectorAll('script[src^="https://www.paypal.com/sdk/js"]').forEach((s) => s.remove());
  return new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src, async: true });
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK missing")));
    s.onerror = () => reject(new Error("PayPal SDK failed to load"));
    document.head.appendChild(s);
  });
}

export default function PayPalButton({ clientId, currency, orderId, onApproved, onError }: { clientId: string; currency: string; orderId: string; onApproved: () => void; onError: (msg: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let buttons: ReturnType<PayPalNamespace["Buttons"]> | null = null;
    let cancelled = false;
    loadSdk(clientId, currency)
      .then((pp) => {
        if (cancelled || !box.current) return;
        buttons = pp.Buttons({ createOrder: () => orderId, onApprove: async () => onApproved(), onError: () => onError("PayPal could not complete the payment.") });
        return buttons.render(box.current);
      })
      .catch((e) => onError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; buttons?.close(); };
  }, [clientId, currency, orderId, onApproved, onError]);
  return <div>{loading && <p className="text-ink-soft">Loading PayPal…</p>}<div ref={box} /></div>;
}
