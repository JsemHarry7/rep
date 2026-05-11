import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

/* ---------- Modal ----------
 *
 * Minimal dialog. Backdrop dismiss, ESC dismiss, body scroll lock.
 * No animation libraries — keep it lean. CSS transition on open
 * if we want it later.
 */
export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8">
      <div
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative hairline rounded-md bg-surface shadow-xl w-full ${maxWidth} max-h-[85vh] overflow-y-auto`}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="px-5 sm:px-6 py-4 border-b border-line flex items-center justify-between gap-3">
            <h2 className="display text-xl text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="data text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink transition-colors"
              aria-label="zavřít"
            >
              zavřít ×
            </button>
          </div>
        )}
        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
