import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CardForm } from "@/components/add/CardForm";
import type { Card, Deck } from "@/types";

/* ---------- Edit / delete dialogs ----------
 *
 * Forms live in child components so they mount fresh each time the
 * modal opens — that way `useState(initialValue)` actually picks up
 * the current deck/card prop instead of being stuck on the value at
 * first mount.
 */

export function EditCardDialog({
  card,
  open,
  onClose,
}: {
  card: Card | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!card || !open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Upravit kartu" maxWidth="max-w-2xl">
      <EditCardForm card={card} onClose={onClose} />
    </Modal>
  );
}

function EditCardForm({ card, onClose }: { card: Card; onClose: () => void }) {
  const updateCard = useAppStore((s) => s.updateCard);
  return (
    <CardForm
      initial={card}
      lockType
      saveLabel="Uložit změny"
      onCancel={onClose}
      onSave={(next) => {
        updateCard(card.id, next as Partial<Card>);
        onClose();
      }}
    />
  );
}

export function DeleteCardDialog({
  card,
  open,
  onClose,
}: {
  card: Card | null;
  open: boolean;
  onClose: () => void;
}) {
  const deleteCard = useAppStore((s) => s.deleteCard);
  if (!card || !open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Smazat kartu?" maxWidth="max-w-md">
      <p className="prose text-sm text-ink-dim mb-5">
        Karta bude smazána včetně její review historie pro SRS. Tahle akce
        je nevratná — pokud nejsi v záloze, je pryč.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => {
            deleteCard(card.id);
            onClose();
          }}
          variant="danger"
          size="md"
        >
          Smazat
        </Button>
        <Button onClick={onClose} variant="ghost" size="md">
          Zrušit
        </Button>
      </div>
    </Modal>
  );
}

export function EditDeckDialog({
  deck,
  open,
  onClose,
}: {
  deck: Deck | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!deck || !open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Upravit deck" maxWidth="max-w-xl">
      <EditDeckForm deck={deck} onClose={onClose} />
    </Modal>
  );
}

function EditDeckForm({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const updateDeck = useAppStore((s) => s.updateDeck);
  const [title, setTitle] = useState(deck.title);
  const [description, setDescription] = useState(deck.description ?? "");
  const [tags, setTags] = useState(deck.tags.join(", "));

  const handleSave = () => {
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateDeck(deck.id, {
      title: title.trim() || deck.id,
      description: description.trim() || undefined,
      tags: parsedTags,
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">
          název
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="form-input"
          autoFocus
        />
      </label>
      <label className="block">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">
          popis · volitelný
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="form-textarea"
        />
      </label>
      <label className="block">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">
          tagy · oddělené čárkou
        </div>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="literatura, shakespeare"
          className="form-input"
        />
      </label>
      <div className="flex items-center gap-2 flex-wrap pt-2">
        <Button onClick={handleSave} variant="primary" size="md">
          Uložit změny →
        </Button>
        <Button onClick={onClose} variant="ghost" size="md">
          Zrušit
        </Button>
      </div>
    </div>
  );
}

export function DeleteDeckDialog({
  deck,
  open,
  onClose,
  onDeleted,
}: {
  deck: Deck | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const deleteDeck = useAppStore((s) => s.deleteDeck);
  if (!deck || !open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Smazat deck?" maxWidth="max-w-md">
      <p className="prose text-sm text-ink-dim mb-4">
        Smazání decku <span className="data text-ink">{deck.title}</span>{" "}
        odstraní i všechny jeho karty a jejich SRS stav. Review historie
        zůstane v databázi, ale orphaned (bez navázané karty).
      </p>
      <p className="prose text-sm text-bad mb-5">
        Tahle akce je nevratná. Než klikneš, zvaž stažení zálohy v
        Nastavení.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => {
            deleteDeck(deck.id);
            onClose();
            onDeleted();
          }}
          variant="danger"
          size="md"
        >
          Ano, smazat
        </Button>
        <Button onClick={onClose} variant="ghost" size="md">
          Zrušit
        </Button>
      </div>
    </Modal>
  );
}
