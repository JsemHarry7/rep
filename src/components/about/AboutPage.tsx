import { useLocation } from "wouter";
import { Button } from "@/components/ui/Button";

/* ---------- /about ----------
 *
 * Hidden-ish page. Linked from landing footer and from settings. Holds
 * personal story + tech credits + contact for cloud-sync gatekeeping.
 * Not in main nav.
 */
export function AboutPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-dvh bg-surface overflow-y-auto [scrollbar-gutter:stable]">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/home")}
            className="flex items-baseline gap-3"
            aria-label="rep — home"
          >
            <span className="data text-base font-semibold lowercase tracking-tight text-ink leading-none">
              r
              <sup className="text-[0.55em] font-medium relative -top-[1em] ml-[0.05em]">
                n
              </sup>
            </span>
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
              rep · o projektu
            </span>
          </button>
          <button
            onClick={() => navigate("/home")}
            className="
              data text-[10px] uppercase tracking-widest
              text-ink-muted hover:text-accent transition-colors
              min-h-[44px] -mr-2 px-2
              flex items-center gap-1.5
            "
            aria-label="zavřít"
          >
            <span className="hidden sm:inline">zavřít</span>
            <span aria-hidden className="text-lg leading-none">×</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        <div className="data text-[10px] uppercase tracking-widest text-accent mb-6">
          o projektu
        </div>

        <h1 className="display text-5xl sm:text-7xl mb-6 leading-tight">
          <span className="italic">rep</span> je můj
          <br />
          maturitní cheat sheet.
        </h1>

        <div className="prose text-base text-ink-dim max-w-prose space-y-4 mb-12">
          <p>
            Studuju na střední, maturita je v květnu 2026. Flashcard appky
            mě dlouho štvaly. Anki je přetížený jak kosmická loď a vypadá
            jako Word 2003. NotebookLM má jen "umím / neumím", což pro
            mě, statistik-vědomého maniaka, není odpověď.
          </p>
          <p>
            Tak jsem si během pár víkendů postavil vlastní. Local-first,
            žádný účet, žádné poplatky, žádné dark patterns. Když to{" "}
            <span className="text-ink">funguje</span>, super; když ne,
            stěžovat si můžeš jen sám sobě, protože vlastníš celej kód.
          </p>
          <p>
            Pomocník s AI nepošle nic sám. Vyrobí prompt, ten kopíruješ
            ven do své oblíbené AI služby, odpověď přineseš zpátky.
            Žádné API klíče v appce, žádná tichá telemetrie, žádný
            "freemium tier". Tohle není SaaS — a snažím se aby to ani
            nikdy nebylo.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            postaveno z
          </h2>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 data text-sm text-ink-dim">
            <li>· React 19 + TypeScript</li>
            <li>· Vite + Tailwind v4</li>
            <li>· Zustand (state)</li>
            <li>· wouter (routing)</li>
            <li>· vite-plugin-pwa</li>
            <li>· Cloudflare Pages + D1 (cloud sync)</li>
            <li>
              · Instrument Serif · Inter · JetBrains Mono
            </li>
            <li>
              · navy <span className="text-ink">#1f2b44</span> + terracotta{" "}
              <span className="text-accent">#c97f5a</span>
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            inspirace
          </h2>
          <ul className="data text-sm text-ink-dim space-y-1">
            <li>· Anki — za SRS algoritmus, ne za UI</li>
            <li>· NotebookLM — za zdrojový workflow, ne za "umím/neumím"</li>
            <li>· Charm.sh tooly — za CLI estetiku</li>
            <li>· Linear, Vercel, Anthropic — za restraint</li>
          </ul>
        </section>

        <section className="mb-12 hairline rounded-md p-5 sm:p-6 bg-surface-elev">
          <h2 className="data text-[10px] uppercase tracking-widest text-accent mb-3">
            cloud sync
          </h2>
          <p className="prose text-base text-ink mb-3 max-w-prose">
            Multi-device sync přijde v dalším milestonu. Bude{" "}
            <span className="italic">private alpha</span> — beru jen lidi,
            které osobně znám.
          </p>
          <p className="prose text-sm text-ink-dim mb-4 max-w-prose">
            Pokud jsi jeden z nich a chceš access, napiš mi. Jinak
            local-first režim funguje bez omezení a localStorage je s
            tebou až do smrti jednoho z vás.
          </p>
          <a
            href="mailto:kontakt@harrydeiml.ing?subject=rep%20cloud%20sync%20access"
            className="
              inline-flex items-center gap-2
              border border-navy bg-transparent text-navy
              px-5 py-2 rounded-sm
              font-sans text-sm font-medium
              hover:bg-navy hover:text-navy-fg
              transition-colors
            "
          >
            kontakt@harrydeiml.ing →
          </a>
        </section>

        <section className="mb-12">
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            kontakt
          </h2>
          <ul className="data text-sm text-ink-dim space-y-2">
            <li>
              · stránka:{" "}
              <a
                href="https://harrydeiml.ing"
                target="_blank"
                rel="noreferrer"
                className="text-ink hover:text-accent transition-colors"
              >
                harrydeiml.ing
              </a>{" "}
              <span className="text-ink-muted">
                (ano, ten <span className="data">.ing</span> TLD je záměrný)
              </span>
            </li>
            <li>
              · mail:{" "}
              <a
                href="mailto:kontakt@harrydeiml.ing"
                className="text-ink hover:text-accent transition-colors"
              >
                kontakt@harrydeiml.ing
              </a>
            </li>
          </ul>
        </section>

        <section className="border-t border-line pt-8 mb-6">
          <p className="prose text-sm text-ink-dim mb-2">
            <span className="italic text-accent">crafted by harry</span> ·
            v rage a v <span className="data">Instrument Serif</span> ·
            maturita 2026
          </p>
          <p className="data text-[10px] uppercase tracking-widest text-ink-muted">
            v0.0.1 · local-first PWA
          </p>
        </section>

        <Button onClick={() => navigate("/home")} variant="primary">
          ← Zpět domů
        </Button>
      </main>
    </div>
  );
}
