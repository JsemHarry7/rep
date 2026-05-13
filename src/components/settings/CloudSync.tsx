import { useEffect, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { getLastRejectedEmail, useCloudAuth } from "@/lib/cloudAuth";
import { fetchCloudMeta, pullFromCloud, pushToCloud, type CloudMeta } from "@/lib/sync";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/* ---------- CloudSync ----------
 *
 * Settings card that handles Google sign-in + manual sync controls.
 * No auto-sync (yet) — user explicitly pushes/pulls. This avoids the
 * "I edited on phone, opened laptop, lost work" trap until conflict
 * resolution is properly designed.
 *
 * GoogleOAuthProvider is mounted here (lazily) rather than at app root
 * so the Google Identity Services script (~98 KB + third-party cookies)
 * only loads when the user actually visits Settings. Cuts cold-load
 * weight on Landing/Dashboard significantly.
 */
export function CloudSync() {
  // Cheap early return — if CLIENT_ID is missing we render the "not
  // configured" panel without ever mounting the provider, so the GIS
  // script never loads.
  if (!CLIENT_ID) {
    return (
      <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1">
          cloud sync · nenakonfigurovaný
        </div>
        <p className="prose text-sm text-ink-dim max-w-prose">
          Tato instalace nemá nastavený{" "}
          <span className="data">VITE_GOOGLE_CLIENT_ID</span>. Cloud sync
          nefunguje. Local-first režim funguje normálně — záloha přes JSON
          export.
        </p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <CloudSyncContent />
    </GoogleOAuthProvider>
  );
}

function CloudSyncContent() {
  const { user, status, errorMessage, signIn, signOut, init } = useCloudAuth();
  const localCardCount = useAppStore((s) => s.userCards.length);
  const localDeckCount = useAppStore((s) => s.userDecks.length);
  const [syncStatus, setSyncStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<"push" | "pull" | null>(null);
  const [cloudMeta, setCloudMeta] = useState<CloudMeta | null>(null);

  // Initialize auth state on mount.
  useEffect(() => {
    if (status === "unknown") init();
  }, [status, init]);

  // Refresh the cloud-side counts whenever sign-in flips on, after a
  // sync finishes, or when local counts change (so the comparison stays
  // honest as the user edits).
  useEffect(() => {
    if (status !== "signed-in") {
      setCloudMeta(null);
      return;
    }
    void fetchCloudMeta().then(setCloudMeta);
  }, [status, busy]);

  const handlePush = async () => {
    // Foolproof check: if we know cloud has more cards than local,
    // pushing would shrink the remote dataset. Force the user to
    // actively confirm with both numbers visible — the friend's
    // "kliknul jsem na nahrát omylem" flow gets caught here.
    if (cloudMeta && cloudMeta.cardCount > localCardCount) {
      const lossDelta = cloudMeta.cardCount - localCardCount;
      const ok = confirm(
        `⚠ Push by zmenšil cloud z ${cloudMeta.cardCount} karet na ${localCardCount}.\n\n` +
          `Lokálně máš méně karet než v cloudu (${lossDelta} karet by se ztratilo). ` +
          `Pokud chceš stáhnout cloud, použij ↓ Stáhnout. Jinak pokračuj jen pokud opravdu víš co děláš.\n\n` +
          `Záloha předchozího cloud stavu zůstává pár dní v Cloud zálohách (Settings).`,
      );
      if (!ok) return;
    }
    setBusy("push");
    setSyncStatus(null);
    const r = await pushToCloud();
    setSyncStatus({
      ok: r.ok,
      text: r.ok ? "Lokální data nahrána do cloudu." : (r.message ?? "Push selhal."),
    });
    setBusy(null);
    window.setTimeout(() => setSyncStatus(null), 5000);
  };

  const handlePull = async () => {
    if (!confirm("Stáhnout data z cloudu? Současná lokální data se přepíšou.")) {
      return;
    }
    setBusy("pull");
    setSyncStatus(null);
    const r = await pullFromCloud();
    setSyncStatus({
      ok: r.ok,
      text: r.ok ? "Data z cloudu načtena." : (r.message ?? "Pull selhal."),
    });
    setBusy(null);
    window.setTimeout(() => setSyncStatus(null), 5000);
  };

  if (status === "not-configured") {
    return (
      <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
        <div className="data text-[10px] uppercase tracking-widest text-bad mb-1">
          backend není nakonfigurovaný
        </div>
        <p className="prose text-sm text-ink-dim max-w-prose">
          Backend nemá nastavený <span className="data">GOOGLE_CLIENT_ID</span>{" "}
          nebo <span className="data">SESSION_SECRET</span> v env vars.
          Cloud sync nefunguje.
        </p>
      </div>
    );
  }

  if (status === "loading" || status === "unknown") {
    return (
      <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
        <p className="data text-xs text-ink-muted uppercase tracking-widest">
          načítám…
        </p>
      </div>
    );
  }

  if (status === "not-authorized") {
    const rejected = getLastRejectedEmail();
    return (
      <div className="hairline border-bad rounded-md p-4 sm:p-5 bg-surface-elev">
        <div className="data text-[10px] uppercase tracking-widest text-bad mb-1">
          ✗ není na allowlistu
        </div>
        {rejected && (
          <p className="data text-xs text-ink mb-3 break-all">
            <span className="text-ink-muted">Google poslal: </span>
            {rejected}
          </p>
        )}
        <p className="prose text-sm text-ink-dim mb-4 max-w-prose">
          {errorMessage ??
            "Tvůj email není autorizovaný pro cloud sync. Pro přístup napiš na kontakt@harrydeiml.ing."}
        </p>
        <p className="prose text-xs text-ink-muted mb-4 max-w-prose">
          Pošli admina <span className="data">přesně tenhle email</span> (i s
          tečkami a velkými písmeny), at&apos; ho přidá. Google posílá email
          tak, jak je registrovaný — ne nutně tak, jak ho píšeš.
        </p>
        <Button onClick={() => signOut()} variant="secondary" size="sm">
          Sign out
        </Button>
      </div>
    );
  }

  if (status === "signed-in" && user) {
    const lastSync = user.lastSyncAt
      ? new Date(user.lastSyncAt).toLocaleString("cs", {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "ještě nikdy";
    return (
      <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="data text-[10px] uppercase tracking-widest text-ok mb-1">
              ✓ přihlášený jako
            </div>
            <p className="prose text-base text-ink">{user.email}</p>
          </div>
          <Button onClick={() => signOut()} variant="ghost" size="sm">
            Odhlásit
          </Button>
        </div>
        <p className="data text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          poslední sync: {lastSync}
        </p>

        {/* Counts side-by-side — biggest signal that push would be lossy */}
        <div className="hairline rounded-md p-3 mb-4 bg-surface flex items-center gap-4 flex-wrap data text-xs">
          <div>
            <span className="text-ink-muted">lokálně </span>
            <span className="text-ink tabular-nums">
              {localDeckCount}d / {localCardCount}c
            </span>
          </div>
          <span className="text-ink-muted">↔</span>
          <div>
            <span className="text-ink-muted">cloud </span>
            {cloudMeta === null ? (
              <span className="text-ink-muted">…</span>
            ) : (
              <span
                className={`tabular-nums ${
                  cloudMeta.cardCount > localCardCount ? "text-accent" : "text-ink"
                }`}
              >
                {cloudMeta.deckCount}d / {cloudMeta.cardCount}c
              </span>
            )}
          </div>
          {cloudMeta && cloudMeta.cardCount > localCardCount && (
            <span className="text-accent">
              ⚠ push by smazal {cloudMeta.cardCount - localCardCount} karet
            </span>
          )}
        </div>

        <p className="prose text-xs text-ink-muted max-w-prose">
          Auto-sync běží — edity se odešlou do cloudu pár sekund po tom,
          co přestaneš psát. Pull se spustí automaticky když otevřeš app
          na čerstvém zařízení. Nic ručně dělat nemusíš.
        </p>

        {syncStatus && (
          <p
            className={`mt-3 data text-xs ${syncStatus.ok ? "text-ok" : "text-bad"}`}
          >
            {syncStatus.text}
          </p>
        )}

        {/* Manual push/pull is destructive territory — collapsed by
            default so běžný uživatel nezavadí. Open only when user
            actively wants to force-overwrite a side. */}
        <details className="mt-5 group">
          <summary className="cursor-pointer data text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink transition-colors py-2 select-none">
            ▸ pokročilé · ruční sync
          </summary>
          <div className="mt-3 pl-3 border-l border-line space-y-3">
            <p className="prose text-xs text-ink-dim max-w-prose">
              Tyhle tlačítka přepisují jednu stranu druhou —{" "}
              <span className="text-bad">jsou destruktivní</span>. Použij
              jen když víš co děláš (typicky řešení konfliktu mezi
              zařízeními). Auto-sync běžně stačí.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handlePush}
                disabled={busy !== null}
                variant="secondary"
                size="sm"
              >
                {busy === "push" ? "Nahrávám…" : "↑ Přepsat cloud lokálem"}
              </Button>
              <Button
                onClick={handlePull}
                disabled={busy !== null}
                variant="secondary"
                size="sm"
              >
                {busy === "pull" ? "Stahuji…" : "↓ Přepsat lokál cloudem"}
              </Button>
            </div>
            <p className="prose text-[10px] text-ink-muted">
              Když uděláš chybu, podívej se do{" "}
              <span className="data">Cloud zálohy</span> niže — drží
              posledních 5 stavů cloudu, snadno se vrátí.
            </p>
          </div>
        </details>
      </div>
    );
  }

  // signed-out (or error fallback)
  return (
    <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
      <p className="prose text-sm text-ink-dim mb-4 max-w-prose">
        Multi-device backup pro autorizované uživatele. Přihlás se přes
        Google — pokud je tvůj email na allowlistu, můžeš pushnout/pullnout
        data mezi zařízeními.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <GoogleLogin
          onSuccess={(resp) => {
            if (resp.credential) signIn(resp.credential);
          }}
          onError={() => {
            // Just leave the button visible — user can retry.
          }}
          theme="outline"
          size="medium"
          text="signin_with"
        />
      </div>
      {errorMessage && status === "error" && (
        <p className="mt-3 data text-xs text-bad">{errorMessage}</p>
      )}
    </div>
  );
}
