"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: Error) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  className?: string;
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    if ((window as any).turnstile) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT}"]`
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Gagal memuat Turnstile script."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Gagal memuat Turnstile script."));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export default function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Store callbacks in refs so the effect doesn't re-run on every keystroke
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  onVerifyRef.current = onVerify;
  onErrorRef.current = onError;
  onExpireRef.current = onExpire;

  // Only re-render widget when siteKey/theme/size change (not callbacks)
  const renderWidget = useCallback(() => {
    const turnstile = (window as any).turnstile;
    if (!turnstile || !containerRef.current) return;

    if (widgetIdRef.current) {
      turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    try {
      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        language: 'id',
        callback: (token: string) => {
          onVerifyRef.current(token);
        },
        "error-callback": (error: any) => {
          onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
        },
        "expired-callback": () => {
          onExpireRef.current?.();
        },
      });
      renderedRef.current = true;
    } catch (err) {
      setScriptError("Gagal merender verifikasi keamanan.");
      onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [siteKey, theme, size]);

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (!cancelled) renderWidget();
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setScriptError("Verifikasi keamanan sedang tidak tersedia.");
          onErrorRef.current?.(err);
        }
      });

    return () => {
      cancelled = true;
      const turnstile = (window as any).turnstile;
      if (widgetIdRef.current && turnstile) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
        renderedRef.current = false;
      }
    };
  }, [renderWidget]);

  if (scriptError) {
    return (
      <div className={`text-xs text-destructive ${className}`}>
        {scriptError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex justify-center ${className}`}
      aria-label="Verifikasi keamanan Cloudflare Turnstile"
    />
  );
}
