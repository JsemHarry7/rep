/* ---------- AllowlistManager ----------
 *
 * Owner-only Settings card: list of allowed emails + add/remove inline.
 * Hidden entirely when the signed-in user isn't the OWNER_EMAIL on the
 * backend. Backend re-checks ownership on every request — frontend
 * gating is just UX, not security.
 */

import { useEffect, useState } from "react";
import {
  addAllowed,
  listAllowed,
  removeAllowed,
  type AllowedEmail,
} from "@/lib/allowlist";
import { useCloudAuth } from "@/lib/cloudAuth";
import { Button } from "@/components/ui/Button";

export function AllowlistManager() {
  const user = useCloudAuth((s) => s.user);
  const [items, setItems] = useState<AllowedEmail[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addNote, setAddNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isOwner) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isOwner]);

  if (!user?.isOwner) return null;

  async function reload() {
    setBusy(true);
    const r = await listAllowed();
    setBusy(false);
    if (r.ok) {
      setItems(r.data);
      setError(null);
    } else {
      setError(r.message);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = addEmail.trim();
    if (!email) return;
    setBusy(true);
    const r = await addAllowed(email, addNote);
    setBusy(false);
    if (r.ok) {
      setAddEmail("");
      setAddNote("");
      setError(null);
      await reload();
    } else {
      setError(r.message);
    }
  }

  async function handleRemove(email: string) {
    if (!confirm(`Odebrat ${email} z allowlistu?`)) return;
    setBusy(true);
    const r = await removeAllowed(email);
    setBusy(false);
    if (r.ok) {
      setError(null);
      await reload();
    } else {
      setError(r.message);
    }
  }

  return (
    <div className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
      <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
        <h3 className="data text-[10px] uppercase tracking-widest text-accent">
          cloud access · allowlist
        </h3>
        <span className="data text-[10px] uppercase tracking-widest text-ink-muted">
          owner only
        </span>
      </div>
      <p className="prose text-xs text-ink-dim mb-4 max-w-prose">
        Kdo se může přihlásit do cloud syncu. Změny se projeví okamžitě
        — žádný redeploy. Tvůj email{" "}
        <span className="data text-ink">{user.email}</span> je vždy
        povolený přes env var, není potřeba ho přidávat.
      </p>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="grid sm:grid-cols-[1fr_auto] gap-2 mb-4"
      >
        <div className="grid sm:grid-cols-[1fr_1fr] gap-2">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="kamarad@gmail.com"
            className="form-input"
            disabled={busy}
            required
          />
          <input
            type="text"
            value={addNote}
            onChange={(e) => setAddNote(e.target.value)}
            placeholder="poznámka (volitelná)"
            className="form-input"
            disabled={busy}
            maxLength={200}
          />
        </div>
        <Button type="submit" variant="primary" size="md" disabled={busy || !addEmail.trim()}>
          + přidat
        </Button>
      </form>

      {error && (
        <p className="data text-xs text-bad mb-3 break-all">{error}</p>
      )}

      {/* List */}
      {items === null ? (
        <p className="data text-xs text-ink-muted uppercase tracking-widest">
          načítám…
        </p>
      ) : items.length === 0 ? (
        <p className="data text-xs text-ink-muted uppercase tracking-widest">
          zatím nikdo — přidej email nahoře
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li
              key={item.email}
              className="py-2 flex items-center gap-3 flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <div className="data text-sm text-ink break-all">{item.email}</div>
                {item.note && (
                  <div className="prose text-xs text-ink-dim">{item.note}</div>
                )}
              </div>
              <span className="data text-[10px] uppercase tracking-widest text-ink-muted tabular-nums">
                {new Date(item.addedAt).toLocaleDateString("cs", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <button
                onClick={() => handleRemove(item.email)}
                disabled={busy}
                className="
                  data text-[11px] uppercase tracking-widest
                  text-ink-muted hover:text-bad transition-colors
                  px-3 py-2 min-h-[40px]
                  disabled:opacity-50
                "
                aria-label={`odebrat ${item.email}`}
              >
                ✕ odebrat
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
