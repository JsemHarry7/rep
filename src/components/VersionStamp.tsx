/* ---------- VersionStamp + ChangelogModal ----------
 *
 * The small `v1.2.5` chip that appears in Sidebar (desktop),
 * MobileTopBar (mobile), and the Landing page hero. Clickable —
 * opens a modal that shows the changelog. Single source of truth
 * for both the displayed version and its history is
 * src/lib/changelog.ts.
 *
 * Visual: matches the existing data/uppercase/tracked-widest style
 * but with hover affordance so people realize it's interactive.
 */

import { useState } from "react";
import { CHANGELOG, CURRENT_VERSION } from "@/lib/changelog";
import { Modal } from "@/components/ui/Modal";

interface Props {
  /** "chrome" → text-chrome-fg-muted, used on the dark sidebar / mobile bar.
   *  "surface" → text-ink-muted, used on light surfaces (landing page). */
  tone?: "chrome" | "surface";
  /** Optional prefix like `v` — caller can omit if rendered context already has one. */
  showVPrefix?: boolean;
}

export function VersionStamp({ tone = "chrome", showVPrefix = true }: Props) {
  const [open, setOpen] = useState(false);

  const toneClass =
    tone === "chrome"
      ? "text-chrome-fg-muted hover:text-chrome-fg"
      : "text-ink-muted hover:text-accent";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`
          data text-[10px] uppercase tracking-widest
          ${toneClass}
          transition-colors
          min-h-[28px] px-1
          underline decoration-dotted underline-offset-4
        `}
        aria-label={`verze ${CURRENT_VERSION} — zobrazit changelog`}
        title="Co je nového"
      >
        {showVPrefix ? `v${CURRENT_VERSION}` : CURRENT_VERSION}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Co je nového · v${CURRENT_VERSION}`}
        maxWidth="max-w-2xl"
      >
        <ChangelogList />
      </Modal>
    </>
  );
}

function ChangelogList() {
  return (
    <div className="space-y-8">
      {CHANGELOG.map((release, idx) => (
        <section key={release.version}>
          <header className="flex items-baseline gap-3 flex-wrap mb-3">
            <h3 className="data text-base font-semibold text-ink tabular-nums">
              v{release.version}
            </h3>
            {idx === 0 && (
              <span className="data text-[10px] uppercase tracking-widest text-accent">
                aktuální
              </span>
            )}
            <span className="data text-[10px] uppercase tracking-widest text-ink-muted tabular-nums">
              {release.date}
            </span>
          </header>
          {release.headline && (
            <p className="prose text-sm text-ink-dim italic mb-3">
              {release.headline}
            </p>
          )}
          <ul className="space-y-2">
            {release.highlights.map((h, i) => (
              <li
                key={i}
                className="prose text-sm text-ink-dim flex items-baseline gap-2"
              >
                <span aria-hidden className="data text-[10px] text-accent mt-0.5 shrink-0">
                  ─
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="border-t border-line pt-4">
        <p className="data text-[10px] uppercase tracking-widest text-ink-muted">
          další release notes přibývají sem
        </p>
      </footer>
    </div>
  );
}
