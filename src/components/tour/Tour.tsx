import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/Button";

interface Step {
  route: string;
  selector: string;
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    route: "/home",
    selector: '[data-tour="greeting"]',
    title: "Vítej v rep.",
    body:
      "Tady jsi doma. Vlevo nahoře je logo — kliknutím se sem vždycky vrátíš odkudkoliv. Pojďme si rychle projít, kde co je.",
  },
  {
    route: "/home",
    selector: '[data-tour="focus"]',
    title: "Co tě dneska čeká.",
    body:
      "Když máš karty zralé na opakování, odsud klikneš rovnou na SRS review. Když ne, appka navrhne přidat nové. Tahle dlaždice je tvůj denní startovní bod.",
  },
  {
    route: "/home",
    selector: '[data-tour="stats"]',
    title: "Jak ti to jde.",
    body:
      "Streak (kolik dní v řadě něco děláš), due (kolik karet je k opakování), dnes (počet dnešních review), celkem (lifetime). Streak svítí teracotou — má tě bavit nepřerušit ho.",
  },
  {
    route: "/home",
    selector: '[data-tour="actions"]',
    title: "Kam odsud.",
    body:
      "Čtyři dlaždice vedou k hlavním sekcím. Začni Přidáním karet — pomocník s AI je nejrychlejší cesta jak nakrmit deck obsahem.",
  },
  {
    route: "/add",
    selector: '[data-tour="add-tabs"]',
    title: "Jak naplnit deck.",
    body:
      "Pomocník: vlož téma nebo zdroj, dostaneš prompt, ten kopíruješ do ChatGPT/Claude/Gemini, odpověď vrátíš zpátky. Nahrát: .md/.txt soubor. Ručně: po jedné přes formulář — pro doplnění detailů.",
  },
  {
    route: "/stats",
    selector: '[data-tour="stats-heatmap"]',
    title: "Měření pokroku.",
    body:
      "GitHub-style heatmap aktivity, mastery po decících, kalibrace, projekce k termínům. Vyplní se to, jakmile uděláš první review — teď je to logicky prázdné.",
  },
  {
    route: "/home",
    selector: '[data-tour="greeting"]',
    title: "A je to.",
    body:
      "Tour si můžeš znovu spustit v Nastavení. Pokud něco padá nebo chybí, napiš mi — kontakt je v sekci O projektu. Hodně štěstí s učením.",
  },
];

interface Props {
  onComplete: () => void;
}

export function Tour({ onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [, navigate] = useLocation();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[stepIndex];

  /* ---------- Navigate to route + measure target on step change ---------- */
  useEffect(() => {
    navigate(step.route);
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        // Try again — route may not have rendered yet.
        setTimeout(measure, 80);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        setRect(r);
      }, 320);
    };
    measure();
    return () => {
      cancelled = true;
    };
  }, [stepIndex, step.route, step.selector, navigate]);

  /* ---------- Re-measure on resize/scroll ---------- */
  useLayoutEffect(() => {
    const handler = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [step.selector]);

  const next = useCallback(() => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else onComplete();
  }, [stepIndex, onComplete]);

  const prev = useCallback(() => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }, [stepIndex]);

  /* ---------- Keyboard ---------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onComplete();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, onComplete]);

  /* ---------- Tooltip position ---------- */
  let tooltipStyle: React.CSSProperties = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };
  if (rect) {
    const margin = 16;
    const tooltipWidth = 360;
    const tooltipApproxHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > tooltipApproxHeight + margin;
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - tooltipWidth - margin),
    );
    if (placeBelow) {
      tooltipStyle = { top: rect.bottom + margin, left };
    } else {
      tooltipStyle = {
        bottom: window.innerHeight - rect.top + margin,
        left,
      };
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop with cutout via SVG mask */}
      <svg
        className="absolute inset-0 pointer-events-auto"
        width="100%"
        height="100%"
        onClick={onComplete}
      >
        <defs>
          <mask id="tour-cutout">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - 6}
                y={rect.top - 6}
                width={rect.width + 12}
                height={rect.height + 12}
                rx={6}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(10, 12, 20, 0.65)"
          mask="url(#tour-cutout)"
        />
      </svg>

      {/* Accent ring around target */}
      {rect && (
        <div
          className="absolute pointer-events-none rounded-md"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 2px var(--color-accent)",
            transition: "all 220ms ease",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto hairline rounded-md bg-surface p-5 sm:p-6 max-w-[360px]"
        style={{
          ...tooltipStyle,
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div className="data text-[10px] uppercase tracking-widest text-accent mb-2 tabular-nums">
          {String(stepIndex + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
        </div>
        <h3 className="display text-2xl text-ink mb-2 leading-tight">
          {step.title}
        </h3>
        <p className="prose text-sm text-ink-dim mb-5">{step.body}</p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={onComplete}
            className="
              data text-[10px] uppercase tracking-widest
              text-ink-muted hover:text-ink transition-colors
              min-h-[40px] px-2 -mx-2
            "
          >
            přeskočit
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button onClick={prev} variant="ghost" size="sm">
                ← zpět
              </Button>
            )}
            <Button onClick={next} variant="primary" size="sm">
              {stepIndex < steps.length - 1 ? (
                <>
                  Dál <span aria-hidden>→</span>
                </>
              ) : (
                <>Hotovo ✓</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
