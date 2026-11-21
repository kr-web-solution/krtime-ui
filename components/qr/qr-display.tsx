"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { API_BASE_URL, APP_NAME } from "@/lib/config";
import type { QrToken } from "@/lib/types";

function readSlugFromPath(): string {
  if (typeof window === "undefined") return "-";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("qr");
  return idx >= 0 && parts[idx + 1] ? decodeURIComponent(parts[idx + 1]) : "-";
}

function readQuery() {
  if (typeof window === "undefined") return { exp: "", sig: "" };
  const params = new URLSearchParams(window.location.search);
  return {
    exp: params.get("exp") ?? "",
    sig: params.get("sig") ?? "",
  };
}

export function QrDisplay() {
  const [slug, setSlug] = useState("-");
  const [exp, setExp] = useState("");
  const [sig, setSig] = useState("");
  const [token, setToken] = useState<QrToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    setSlug(readSlugFromPath());
    const q = readQuery();
    setExp(q.exp);
    setSig(q.sig);
  }, []);

  const payload = useMemo(() => {
    if (!token) return "";
    return JSON.stringify({
      v: 1,
      site: token.site_slug,
      token: token.token,
      window: token.window,
    });
  }, [token]);

  useEffect(() => {
    if (!slug || slug === "-" || !exp || !sig) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/qr/${encodeURIComponent(slug)}/token?exp=${exp}&sig=${encodeURIComponent(sig)}`,
        );
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.message ?? "Unable to load QR token");
        }
        const data = (await response.json()) as QrToken;
        if (cancelled) return;
        setToken(data);
        setSecondsLeft(data.expires_in);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "QR load failed");
        }
      }
    }

    void load();
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          void load();
          return 30;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [slug, exp, sig]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-black px-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_400px_at_50%_0%,rgba(255,49,49,0.25),transparent_60%),radial-gradient(600px_320px_at_80%_100%,rgba(255,222,89,0.18),transparent_55%)]" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-12 w-12 rounded-md object-contain" />
          <p className="font-display text-3xl tracking-tight text-brand-gold">{APP_NAME}</p>
        </div>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          {slug === "-" ? "Site QR" : slug.replace(/-/g, " ")}
        </h1>
        <p className="mt-2 text-sm text-white/70">Scan to check in or check out</p>

        <div className="mt-8 rounded-3xl border-2 border-brand-gold bg-white p-6 shadow-2xl shadow-brand-red/20">
          {payload ? (
            <QRCodeSVG value={payload} size={280} level="M" includeMargin />
          ) : (
            <div className="grid h-[280px] w-[280px] place-items-center text-sm text-slate-500">
              {error ? "Unavailable" : "Loading…"}
            </div>
          )}
        </div>

        <p className="mt-6 font-mono text-sm tracking-widest text-brand-gold">
          {token?.token ?? "————————"}
        </p>
        <p className="mt-2 text-sm text-white/60">Refreshes in {secondsLeft}s</p>
        {error ? (
          <p className="mt-4 max-w-md text-center text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        {!exp || !sig ? (
          <p className="mt-4 max-w-md text-center text-sm text-brand-gold/90">
            Open this page from an admin-signed display link (includes exp and sig).
          </p>
        ) : null}
      </div>
    </div>
  );
}
