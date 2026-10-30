"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { useI18n } from "@/src/i18n/I18nProvider";
import { registerServiceWorker } from "@/src/lib/pwa/service-worker";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-dismissed-at";
const DISMISS_DAYS = 14;
// Don't greet people with an install banner the instant the page loads.
const SHOW_DELAY_MS = 15_000;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false; // Storage may be disabled.
  }
}

/** "Add to Home Screen" only exists in Safari on iOS — not Chrome/Firefox/in-app browsers. */
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\//.test(ua);
}

export function PwaSupport() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void registerServiceWorker();

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setHidden(standalone || recentlyDismissed());
    setIos(isIosSafari());

    const timer = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setHidden(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || !ready || (!prompt && !ios)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* Storage may be disabled. */
    }
    setHidden(true);
  };

  return (
    <aside
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-crease bg-white p-4 shadow-pop lg:bottom-5"
      aria-label={t("pwa.install")}
    >
      <Download className="h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm text-navy">
        {ios && !prompt ? (
          <p>{t("pwa.installIos")}</p>
        ) : (
          <button
            type="button"
            className="min-h-11 font-semibold underline underline-offset-4"
            onClick={async () => {
              if (!prompt) return;
              try {
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice.outcome === "accepted") setHidden(true);
                else dismiss();
              } finally {
                setPrompt(null);
              }
            }}
          >
            {t("pwa.install")}
          </button>
        )}
      </div>
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-steam"
        aria-label={t("pwa.dismiss")}
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
