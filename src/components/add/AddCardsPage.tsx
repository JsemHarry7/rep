import { useState } from "react";
import { UploadTab } from "./UploadTab";
import { ManualTab } from "./ManualTab";
import { AITab } from "./AITab";

type AddTab = "ai" | "upload" | "manual";

const tabs: { id: AddTab; label: string; description: string }[] = [
  {
    id: "ai",
    label: "Pomocník",
    description:
      "Ze zápisků, zdroje, nebo jen tématu vygeneruje prompt, který pošleš do ChatGPT / Claude / Gemini. Odpověď vrátíš zpátky a karty jsou hotové.",
  },
  {
    id: "upload",
    label: "Nahrát",
    description:
      "Drag-drop nebo vlož .md / .txt soubor v naší markdown konvenci.",
  },
  {
    id: "manual",
    label: "Ručně",
    description: "Vytvoř karty po jedné přes formulář. Vhodné pro doplnění detailů.",
  },
];

export function AddCardsPage() {
  const [tab, setTab] = useState<AddTab>("ai");
  const active = tabs.find((t) => t.id === tab)!;

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="display text-5xl sm:text-6xl mb-3">Přidat karty.</h1>
        <p className="prose text-base text-ink-dim max-w-prose">
          Tři způsoby, jak naložit karty do svých decků. Žádné AI neběží
          uvnitř appky — pomocník ti jen připraví prompt, odpověď si
          obstaráš v externí službě.
        </p>
      </header>

      <nav
        className="grid grid-cols-3 border-y border-line mb-3 -mx-1 sm:mx-0"
        data-tour="add-tabs"
      >
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                relative
                data text-sm uppercase tracking-widest
                px-3 py-4
                transition-colors
                ${
                  isActive
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink"
                }
              `}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 right-0 h-px bg-navy"
                />
              )}
              {t.label}
            </button>
          );
        })}
      </nav>

      <p className="prose text-sm text-ink-dim max-w-prose mb-10">
        {active.description}
      </p>

      <div>
        {tab === "upload" && <UploadTab />}
        {tab === "manual" && <ManualTab />}
        {tab === "ai" && <AITab />}
      </div>
    </div>
  );
}
