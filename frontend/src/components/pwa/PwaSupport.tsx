"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useI18n } from "@/src/i18n/I18nProvider";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaSupport() {
  const { locale } = useI18n();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/push-worker.js").catch(() => {});
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    let previouslyDismissed = false;
    try {
      previouslyDismissed = sessionStorage.getItem("pwa-dismissed") === "1";
    } catch {
      /* Storage may be disabled. */
    }
    setDismissed(standalone || previouslyDismissed);
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setDismissed(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  if (dismissed || (!prompt && !ios)) return null;
  const fr = locale === "fr";
  return (
    <aside
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-crease bg-white p-4 shadow-pop lg:bottom-5"
      aria-label={fr ? "Installer Wedemboyz" : "Install Wedemboyz"}
    >
      <Download className="h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm text-navy">
        {ios ? (
          <p>
            {fr
              ? "Pour installer : Partager → Sur l’écran d’accueil."
              : "To install: Share → Add to Home Screen."}
          </p>
        ) : (
          <button
            type="button"
            className="min-h-11 font-semibold underline underline-offset-4"
            onClick={async () => {
              if (!prompt) return;
              try {
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice.outcome === "accepted") setDismissed(true);
              } finally {
                setPrompt(null);
              }
            }}
          >
            {fr ? "Installer Wedemboyz" : "Install Wedemboyz"}
          </button>
        )}
      </div>
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-steam"
        aria-label={fr ? "Fermer" : "Dismiss"}
        onClick={() => {
          try {
            sessionStorage.setItem("pwa-dismissed", "1");
          } catch {
            /* Storage may be disabled. */
          }
          setDismissed(true);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
