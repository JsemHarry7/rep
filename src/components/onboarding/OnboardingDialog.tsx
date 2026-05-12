import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onComplete: (name: string | null) => void;
}

/* ---------- Onboarding ----------
 *
 * Tiny one-question modal shown to first-time users right after the
 * landing CTA. Asks for a display name; both "Pokračovat" and
 * "Přeskočit" close it. The walkthrough starts after this resolves.
 */
export function OnboardingDialog({ open, onComplete }: Props) {
  const [name, setName] = useState("");

  return (
    <Modal
      open={open}
      onClose={() => onComplete(null)}
      title="Vítej v rep"
      maxWidth="max-w-md"
    >
      <p className="prose text-base text-ink mb-2">Jak ti mám říkat?</p>
      <p className="prose text-sm text-ink-dim mb-5">
        Objeví se v "Vítej, …" na home page. Můžeš nechat prázdné nebo
        kdykoliv změnit v Nastavení.
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onComplete(name.trim() || null);
        }}
        placeholder="Jindra"
        autoFocus
        className="form-input mb-5"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => onComplete(name.trim() || null)}
          variant="primary"
          size="md"
        >
          Pokračovat <span aria-hidden>→</span>
        </Button>
        <Button onClick={() => onComplete(null)} variant="ghost" size="md">
          Přeskočit
        </Button>
      </div>
    </Modal>
  );
}
