import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

/* ---------- PWAInstall ----------
 *
 * Always renders SOMETHING — the user always sees what state PWA install
 * is in. Possible states:
 *
 *   installed     standalone PWA already running
 *   ready         beforeinstallprompt fired; click installs
 *   ios           iOS Safari — manual instructions
 *   waiting       no install prompt available yet (dev mode, criteria
 *                 not met, or browser doesn't support PWAs)
 *
 * Dev mode caveat: in `npm run dev` the service worker isn't registered,
 * so `beforeinstallprompt` never fires. The "waiting" state is normal
 * there. Production build + preview will exercise the prompt path.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstall() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iOS, setIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIos =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error legacy iOS API
      window.navigator.standalone === true;
    setIOS(isIos);
    setInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (installed) {
    return (
      <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
        <div className="data text-[10px] uppercase tracking-widest text-ok mb-1">
          ✓ nainstalováno
        </div>
        <p className="prose text-sm text-ink-dim">
          Spouštíš jako standalone PWA. Žádné browser chrome, vlastní ikona,
          offline funguje.
        </p>
      </div>
    );
  }

  if (event) {
    return (
      <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="data text-[10px] uppercase tracking-widest text-accent mb-1">
            připraveno k instalaci
          </div>
          <p className="prose text-sm text-ink-dim max-w-prose">
            Nainstaluj rep jako appku — vlastní ikona, vlastní okno,
            offline funguje stejně.
          </p>
        </div>
        <Button
          onClick={async () => {
            await event.prompt();
            const { outcome } = await event.userChoice;
            if (outcome === "accepted") setEvent(null);
          }}
          variant="primary"
          size="sm"
        >
          Instalovat →
        </Button>
      </div>
    );
  }

  if (iOS) {
    return (
      <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1">
          iOS · ruční instalace
        </div>
        <p className="prose text-sm text-ink-dim">
          iOS Safari nepodporuje auto-install prompt. Klepni na{" "}
          <span className="data">Share</span> ikonu (čtverec se šipkou
          nahoře), vyber <span className="data">Add to Home Screen</span>.
          Rep se objeví jako appka.
        </p>
      </div>
    );
  }

  return (
    <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1">
        instalace · čeká na prohlížeč
      </div>
      <p className="prose text-sm text-ink-dim max-w-prose">
        Tvůj prohlížeč zatím nenabídl install prompt. To je normální v dev
        módu nebo když ještě nesplnil kritéria (par návratů do appky).
        Můžeš zkusit <span className="data">Add to Home Screen</span> v
        menu prohlížeče (obvykle tři tečky vpravo nahoře).
      </p>
    </div>
  );
}
