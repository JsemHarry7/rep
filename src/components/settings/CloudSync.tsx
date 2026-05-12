import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useCloudAuth } from "@/lib/cloudAuth";
import { pullFromCloud, pushToCloud } from "@/lib/sync";
import { Button } from "@/components/ui/Button";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/* ---------- CloudSync ----------
 *
 * Settings card that handles Google sign-in + manual sync controls.
 * No auto-sync (yet) — user explicitly pushes/pulls. This avoids the
 * "I edited on phone, opened laptop, lost work" trap until conflict
 * resolution is properly designed.
 */
export function CloudSync() {
  const { user, status, errorMessage, signIn, signOut, init } = useCloudAuth();
  const [syncStatus, setSyncStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<"push" | "pull" | null>(null);

  // Initialize auth state on mount.
  useEffect(() => {
    if (status === "unknown") init();
  }, [status, init]);

  const handlePush = async () => {
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
    return (
      <div className="hairline border-bad rounded-md p-4 sm:p-5 bg-surface-elev">
        <div className="data text-[10px] uppercase tracking-widest text-bad mb-1">
          ✗ není na allowlistu
        </div>
        <p className="prose text-sm text-ink-dim mb-4 max-w-prose">
          {errorMessage ??
            "Tvůj email není autorizovaný pro cloud sync. Pro přístup napiš na kontakt@harrydeiml.ing."}
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
        <p className="data text-[10px] uppercase tracking-widest text-ink-muted mb-4">
          poslední sync: {lastSync}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handlePush}
            disabled={busy !== null}
            variant="primary"
            size="sm"
          >
            {busy === "push" ? "Nahrávám…" : "↑ Lokální → cloud"}
          </Button>
          <Button
            onClick={handlePull}
            disabled={busy !== null}
            variant="secondary"
            size="sm"
          >
            {busy === "pull" ? "Stahuji…" : "↓ Cloud → lokální"}
          </Button>
        </div>
        {syncStatus && (
          <p
            className={`mt-3 data text-xs ${syncStatus.ok ? "text-ok" : "text-bad"}`}
          >
            {syncStatus.text}
          </p>
        )}
        <p className="prose text-xs text-ink-muted mt-4 max-w-prose">
          Auto-sync není zapnutý — po editaci na jednom zařízení klikni{" "}
          <span className="data">↑ Lokální → cloud</span>, na druhém{" "}
          <span className="data">↓ Cloud → lokální</span>.
        </p>
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
