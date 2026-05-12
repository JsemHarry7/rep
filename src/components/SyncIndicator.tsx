/* ---------- SyncIndicator ----------
 *
 * Tiny chip showing the current cloud-sync phase. Only renders when the
 * user is signed in — otherwise there's no sync to talk about and we
 * stay out of the way.
 *
 * Variants:
 *   - "chip"    inline ascii-style chip for MobileTopBar / StatusBar
 *   - "verbose" larger version with timestamp for Settings (not used yet)
 */

import { useSyncStatus, type SyncPhase } from "@/lib/autoSync";
import { useCloudAuth } from "@/lib/cloudAuth";

interface Props {
  variant?: "chip" | "verbose";
}

const LABELS: Record<SyncPhase, string> = {
  idle: "synced",
  pending: "změny",
  syncing: "sync…",
  offline: "offline",
  error: "sync ✗",
};

const TONE: Record<SyncPhase, string> = {
  idle: "text-chrome-fg-muted",
  pending: "text-accent",
  syncing: "text-accent",
  offline: "text-chrome-fg-muted",
  error: "text-bad",
};

const DOT: Record<SyncPhase, string> = {
  idle: "bg-ok/70",
  pending: "bg-accent animate-pulse",
  syncing: "bg-accent animate-pulse",
  offline: "bg-chrome-fg-muted/50",
  error: "bg-bad",
};

export function SyncIndicator({ variant = "chip" }: Props) {
  const phase = useSyncStatus((s) => s.phase);
  const lastSyncedAt = useSyncStatus((s) => s.lastSyncedAt);
  const authStatus = useCloudAuth((s) => s.status);

  // Hide entirely when there's no signed-in session.
  if (authStatus !== "signed-in") return null;

  if (variant === "verbose") {
    const ts = lastSyncedAt
      ? new Date(lastSyncedAt).toLocaleTimeString("cs", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
    return (
      <div
        className={`data text-[11px] uppercase tracking-widest ${TONE[phase]} flex items-center gap-2`}
        role="status"
        aria-live="polite"
      >
        <span aria-hidden className={`size-1.5 rounded-full ${DOT[phase]}`} />
        <span>{LABELS[phase]}</span>
        <span className="text-chrome-fg-muted">· {ts}</span>
      </div>
    );
  }

  return (
    <span
      className={`data text-[10px] uppercase tracking-widest ${TONE[phase]} flex items-center gap-1.5`}
      role="status"
      aria-live="polite"
      title={
        lastSyncedAt
          ? `Poslední sync ${new Date(lastSyncedAt).toLocaleTimeString("cs")}`
          : "Auto-sync"
      }
    >
      <span aria-hidden className={`size-1.5 rounded-full ${DOT[phase]}`} />
      <span>{LABELS[phase]}</span>
    </span>
  );
}
