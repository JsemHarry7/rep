import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAppStore, ymd } from "@/lib/store";
import { CURRENT_VERSION } from "@/lib/changelog";
import { downloadBackup, importBackup } from "@/lib/backup";
import type { Deadline } from "@/types";
import { Button } from "@/components/ui/Button";
import { PWAInstall } from "@/components/PWAInstall";
import { CloudSync } from "@/components/settings/CloudSync";
import { AllowlistManager } from "@/components/settings/AllowlistManager";
import { SharedDecksList } from "@/components/settings/SharedDecksList";
import { SnapshotHistory } from "@/components/settings/SnapshotHistory";

export function SettingsPage() {
  const [, navigate] = useLocation();
  const deadlines = useAppStore((s) => s.deadlines);
  const addDeadline = useAppStore((s) => s.addDeadline);
  const updateDeadline = useAppStore((s) => s.updateDeadline);
  const removeDeadline = useAppStore((s) => s.removeDeadline);
  const resetAll = useAppStore((s) => s.resetAll);
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);

  const [confirmReset, setConfirmReset] = useState(false);
  const [importStatus, setImportStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    addDeadline({ name: "Nový termín", date: ymd(today.getTime()) });
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = importBackup(text);
    if (result.ok && result.counts) {
      setImportStatus({
        ok: true,
        text: `Načteno: ${result.counts.userDecks} decků, ${result.counts.userCards} karet, ${result.counts.reviews} review, ${result.counts.deadlines} termínů.`,
      });
    } else {
      setImportStatus({ ok: false, text: result.message });
    }
    window.setTimeout(() => setImportStatus(null), 6000);
  };

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="display text-5xl sm:text-6xl mb-3">Nastavení.</h1>
        <p className="prose text-base text-ink-dim max-w-prose">
          Jméno, denní cíl, termíny, záloha a reset. O projektu a kontakt
          na konci stránky.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          jméno
        </h2>
        <label className="block">
          <div className="data text-[10px] text-ink-muted/80 mb-1.5 normal-case tracking-wide">
            zobrazí se v "Vítej, ..." na home page
          </div>
          <input
            type="text"
            value={user.displayName ?? ""}
            placeholder="Jindra"
            onChange={(e) => updateUser({ displayName: e.target.value || null })}
            className="form-input max-w-sm"
          />
        </label>
      </section>

      <section className="mb-12">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          denní cíl
        </h2>
        <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev flex items-baseline justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="prose text-sm text-ink-dim max-w-prose mb-3">
              Kolik review chceš udělat denně. Dashboard ukáže postup k
              dnešnímu cíli.
            </p>
            <div className="flex items-baseline gap-3">
              <input
                type="number"
                min={1}
                max={500}
                value={user.dailyGoal}
                onChange={(e) =>
                  updateUser({
                    dailyGoal: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="form-input w-24"
              />
              <span className="data text-xs uppercase tracking-widest text-ink-muted">
                review / den
              </span>
            </div>
          </div>
          <div className="display text-5xl tabular-nums text-accent">
            {user.dailyGoal}
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          prohlídka
        </h2>
        <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev flex items-baseline justify-between gap-3 flex-wrap">
          <p className="prose text-sm text-ink-dim max-w-prose">
            Spustit walkthrough znova — provede tě klíčovými sekcemi aplikace.
          </p>
          <Button
            onClick={() => useAppStore.getState().openTour()}
            variant="secondary"
            size="sm"
          >
            Spustit prohlídku →
          </Button>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted">
            termíny
          </h2>
          <button
            onClick={handleAdd}
            className="data text-[10px] uppercase tracking-widest text-ink-dim hover:text-accent transition-colors"
          >
            + přidat termín
          </button>
        </div>
        {deadlines.length === 0 ? (
          <p className="prose text-sm text-ink-muted italic">
            Žádné termíny. Projekce ve Stats se zobrazí, jakmile přidáš
            aspoň jeden.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {deadlines.map((d) => (
              <DeadlineRow
                key={d.id}
                deadline={d}
                onUpdate={(patch) => updateDeadline(d.id, patch)}
                onRemove={() => removeDeadline(d.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          cloud sync
        </h2>
        <CloudSync />
      </section>

      {/* Cloud user — SnapshotHistory auto-hides if not signed in. */}
      <section className="mb-12">
        <SnapshotHistory />
      </section>

      {/* Cloud user — SharedDecksList auto-hides if not signed in. */}
      <section className="mb-12">
        <SharedDecksList />
      </section>

      {/* Owner-only — AllowlistManager auto-hides if !isOwner. */}
      <section className="mb-12">
        <AllowlistManager />
      </section>

      <section className="mb-12">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          aplikace
        </h2>
        <PWAInstall />
      </section>

      <section className="mb-12">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          záloha
        </h2>
        <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
          <p className="prose text-sm text-ink-dim mb-4 max-w-prose">
            Stáhni si všechna data jako <span className="data">.json</span>{" "}
            soubor. Nahraním ho přepíšeš aktuální stav (existující data
            nesplynou — kompletně se nahradí). Pro přesun mezi zařízeními
            nebo jako pojistka před cloud syncem.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={downloadBackup} variant="primary" size="sm">
              <span aria-hidden>↓</span> Stáhnout zálohu
            </Button>
            <Button
              onClick={() => importInputRef.current?.click()}
              variant="secondary"
              size="sm"
            >
              <span aria-hidden>↑</span> Načíst zálohu
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
              className="hidden"
            />
          </div>
          {importStatus && (
            <p
              className={`mt-3 data text-xs ${importStatus.ok ? "text-ok" : "text-bad"}`}
            >
              {importStatus.text}
            </p>
          )}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          data
        </h2>
        <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
          <p className="prose text-sm text-ink-dim mb-4 max-w-prose">
            Všechna data jsou uložená v <span className="data">localStorage</span>{" "}
            pod klíčem <span className="data">rep:v1</span>. Reset smaže
            historii review, SRS stav, vlastní decky, karty i termíny.
          </p>
          {!confirmReset ? (
            <Button
              onClick={() => setConfirmReset(true)}
              variant="secondary"
              size="sm"
            >
              Smazat všechna data
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="data text-xs uppercase tracking-widest text-bad">
                jsi si jistý?
              </span>
              <Button
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
                variant="danger"
                size="sm"
              >
                Ano, smazat
              </Button>
              <Button
                onClick={() => setConfirmReset(false)}
                variant="ghost"
                size="sm"
              >
                Zrušit
              </Button>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          o projektu
        </h2>
        <button
          onClick={() => navigate("/about")}
          className="
            w-full text-left
            hairline rounded-md p-4 sm:p-5
            bg-surface-elev
            hover:border-accent
            transition-colors
            group
            flex items-baseline justify-between gap-3 flex-wrap
          "
        >
          <div className="min-w-0">
            <h3 className="data text-sm font-semibold text-ink mb-1 group-hover:text-accent transition-colors">
              rep · v{CURRENT_VERSION}
            </h3>
            <p className="prose text-sm text-ink-dim max-w-prose">
              Příběh projektu, tech stack, kontakt na cloud sync access.
            </p>
          </div>
          <span className="data text-[10px] uppercase tracking-widest text-ink-dim group-hover:text-accent transition-colors shrink-0">
            otevřít →
          </span>
        </button>
      </section>
    </div>
  );
}

interface RowProps {
  deadline: Deadline;
  onUpdate: (patch: Partial<Omit<Deadline, "id">>) => void;
  onRemove: () => void;
}

function DeadlineRow({ deadline, onUpdate, onRemove }: RowProps) {
  const today = ymd(Date.now());
  const days = daysBetween(today, deadline.date);
  const isPast = days < 0;

  return (
    <li className="px-1 py-3 flex flex-wrap items-center gap-2 sm:gap-3">
      <input
        type="text"
        value={deadline.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="název termínu"
        className="form-input flex-1 min-w-[8rem]"
      />
      <input
        type="date"
        value={deadline.date}
        onChange={(e) => onUpdate({ date: e.target.value })}
        className="form-input w-auto sm:w-44"
      />
      <span
        className={`
          data text-[10px] uppercase tracking-widest tabular-nums
          w-20 text-right shrink-0
          ${isPast ? "text-ink-muted" : days < 14 ? "text-bad" : "text-ink-dim"}
        `}
      >
        {isPast ? `−${Math.abs(days)} d` : `${days} d`}
      </span>
      <button
        onClick={onRemove}
        className="data text-[10px] uppercase tracking-widest text-ink-muted hover:text-bad transition-colors px-2 py-1.5"
      >
        smaž
      </button>
    </li>
  );
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00");
  const b = new Date(toYmd + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}
