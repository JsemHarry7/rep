import { useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";

const features: { title: string; body: string }[] = [
  {
    title: "Pět typů karet",
    body: "Q/A, doplňovačky, výběr z možností, otevřený výklad i kód. Jeden formát, jedna paleta, žádný vizuální cirkus.",
  },
  {
    title: "Pomocník s AI",
    body: "Vlož zápisky nebo jen téma. Aplikace ti připraví prompt — ten pošleš do ChatGPT / Claude / Gemini, odpověď vrátíš zpátky. Žádné AI neběží uvnitř.",
  },
  {
    title: "Spaced repetition",
    body: "Anki-style scheduler tě nechá vidět karty ve správný moment. Plus Sprint, Boss a Cram pro různé typy práce.",
  },
  {
    title: "Statistiky a termíny",
    body: "Heatmap aktivity, mastery podle decku, projekce k tvým termínům. Pro stats-obsessed bytostně.",
  },
];

export function LandingPage() {
  const [, navigate] = useLocation();
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);
  const openTour = useAppStore((s) => s.openTour);

  const onStart = () => {
    updateUser({ landingSeen: true });
    navigate("/home");
    // First-time users get the walkthrough auto-opened once.
    if (!user.tourSeen) {
      setTimeout(() => openTour(), 600);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-surface overflow-y-auto [scrollbar-gutter:stable]">
      {/* Top bar */}
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="data text-base font-semibold lowercase tracking-tight text-ink leading-none">
              r
              <sup className="text-[0.55em] font-medium relative -top-[1em] ml-[0.05em]">
                n
              </sup>
            </span>
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
              rep · repetice
            </span>
          </div>
          <ThemeToggleQuiet />
        </div>
      </header>

      {/* Hero — split layout: copy on left, sample card on right */}
      <section className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-24 grid lg:grid-cols-5 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-3">
            <div className="data text-[10px] uppercase tracking-widest text-accent mb-6">
              v0.0.1 · local-first PWA
            </div>
            <h1 className="display text-6xl sm:text-7xl lg:text-8xl text-ink mb-6 leading-[0.95]">
              Repetice.
              <br />
              <span className="italic text-accent">Jednoduše.</span>
            </h1>
            <p className="prose text-lg sm:text-xl text-ink-dim mb-8 max-w-xl">
              Flashcards, SRS, pomocník s AI — pro lidi co si vážně chtějí
              zapamatovat látku. Ne "umím / neumím", ale{" "}
              <span className="text-ink">pořádně</span>.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={onStart} variant="primary" size="lg">
                Začít <span aria-hidden>→</span>
              </Button>
              <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
                · žádný účet · žádné poplatky
              </span>
            </div>
          </div>

          {/* Sample card preview */}
          <div className="lg:col-span-2">
            <SampleCard />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-10 flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-accent inline-block" />
            co to umí
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
            {features.map((f, i) => (
              <li key={f.title} className="group">
                <div className="data text-[10px] uppercase tracking-widest text-accent mb-2 tabular-nums">
                  {String(i + 1).padStart(2, "0")} ─
                </div>
                <h2 className="display text-3xl sm:text-4xl text-ink mb-2 group-hover:italic transition-all">
                  {f.title}
                </h2>
                <p className="prose text-base text-ink-dim max-w-prose">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stats teaser — "what you'll get" mini preview */}
      <section className="border-b border-line bg-surface-elev">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-14 grid sm:grid-cols-4 gap-6">
          <Teaser
            label="typů karet"
            value="5"
            note="Q/A · Cloze · MCQ · Free · Code"
          />
          <Teaser
            label="módů review"
            value="4"
            note="SRS · Cram · Sprint · Boss"
          />
          <Teaser
            label="způsoby přidání"
            value="3"
            note="upload · ručně · AI"
          />
          <Teaser
            label="lokální"
            value="∞"
            note="data zůstanou u tebe"
            accent
          />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-14 flex flex-wrap items-baseline gap-x-8 gap-y-4 justify-between">
          <div>
            <h3 className="display text-3xl sm:text-4xl text-ink mb-1">
              <span className="italic text-accent">Připraven?</span>
            </h3>
            <p className="prose text-sm text-ink-dim">
              Data zůstanou lokálně, dokud nezapneš cloud sync (M6).
            </p>
          </div>
          <Button onClick={onStart} variant="primary" size="lg">
            Začít <span aria-hidden>→</span>
          </Button>
        </div>
      </section>

      <footer>
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-6 flex items-center justify-between gap-3 data text-[10px] uppercase tracking-widest text-ink-muted flex-wrap">
          <span>
            r
            <sup className="text-[0.55em] font-medium relative -top-[1em] ml-[0.05em]">
              n
            </sup>{" "}
            rep ·{" "}
            <span className="italic text-accent normal-case tracking-normal">
              crafted by harry
            </span>{" "}
            · maturita 2026
          </span>
          <button
            onClick={() => navigate("/about")}
            className="hover:text-accent transition-colors"
          >
            o projektu →
          </button>
        </div>
      </footer>
    </div>
  );
}

function SampleCard() {
  return (
    <div className="hairline rounded-md bg-surface-elev relative">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-line flex items-center justify-between">
        <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
          Q · ukázka
        </span>
        <span className="data text-[10px] uppercase tracking-widest text-ink-muted tabular-nums">
          03/10
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-6">
        <div className="data text-[10px] uppercase tracking-widest text-accent mb-3">
          Q
        </div>
        <h3 className="display text-2xl text-ink mb-5 leading-tight">
          Kdo napsal tragédii Romeo a Julie?
        </h3>
        <hr className="border-line mb-4" />
        <p className="prose text-base text-ink-dim">
          William Shakespeare. Datace cca 1595, raná tragédie.
        </p>
      </div>

      {/* Rating buttons mockup */}
      <div className="grid grid-cols-4 border-t border-line divide-x divide-line">
        {[
          { key: "1", label: "again", tone: "text-bad" },
          { key: "2", label: "hard", tone: "text-ink-dim" },
          { key: "3", label: "good", tone: "text-ok" },
          { key: "4", label: "easy", tone: "text-accent" },
        ].map((r) => (
          <div key={r.key} className="px-2 py-3 text-center">
            <div className={`data text-xs uppercase tracking-widest ${r.tone}`}>
              {r.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Teaser({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={`display text-5xl tabular-nums leading-none mb-2 ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </div>
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1">
        {label}
      </div>
      <div className="data text-[10px] text-ink-dim leading-relaxed">{note}</div>
    </div>
  );
}

function ThemeToggleQuiet() {
  const [theme, , toggle] = useTheme();
  return (
    <button
      onClick={toggle}
      title={`switch to ${theme === "light" ? "dark" : "light"}`}
      className="
        data text-[10px] uppercase tracking-widest
        text-ink-muted hover:text-accent
        transition-colors
        flex items-center gap-1.5
      "
    >
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full bg-current"
      />
      <span>{theme}</span>
    </button>
  );
}
