import { useEffect, useState } from "react";
import type { Deck } from "@/types";

export type DeckTarget =
  | { kind: "existing"; deckId: string }
  | { kind: "new"; title: string; description?: string };

interface Props {
  userDecks: Deck[];
  value: DeckTarget;
  onChange: (next: DeckTarget) => void;
}

export function DeckPicker({ userDecks, value, onChange }: Props) {
  const hasExisting = userDecks.length > 0;
  const [newTitle, setNewTitle] = useState(
    value.kind === "new" ? value.title : "",
  );

  // Keep local newTitle in sync if parent changes externally (e.g. reset).
  useEffect(() => {
    if (value.kind === "new") setNewTitle(value.title);
  }, [value]);

  // If no existing decks, force "new" mode.
  useEffect(() => {
    if (!hasExisting && value.kind !== "new") {
      onChange({ kind: "new", title: newTitle });
    }
  }, [hasExisting]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectExisting = () => {
    if (!hasExisting) return;
    onChange({ kind: "existing", deckId: userDecks[0].id });
  };
  const selectNew = () => onChange({ kind: "new", title: newTitle });

  return (
    <div className="space-y-3">
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted">
        uložit do
      </div>

      {hasExisting && (
        <div className="hairline rounded-md overflow-hidden grid grid-cols-2 divide-x divide-line bg-surface-elev">
          <button
            type="button"
            onClick={selectExisting}
            className={`
              py-2.5 px-3
              data text-xs uppercase tracking-widest
              transition-colors
              ${
                value.kind === "existing"
                  ? "bg-surface text-ink"
                  : "text-ink-muted hover:text-ink"
              }
            `}
          >
            existující deck
          </button>
          <button
            type="button"
            onClick={selectNew}
            className={`
              py-2.5 px-3
              data text-xs uppercase tracking-widest
              transition-colors
              ${
                value.kind === "new"
                  ? "bg-surface text-ink"
                  : "text-ink-muted hover:text-ink"
              }
            `}
          >
            nový deck
          </button>
        </div>
      )}

      {value.kind === "existing" && hasExisting && (
        <select
          value={value.deckId}
          onChange={(e) =>
            onChange({ kind: "existing", deckId: e.target.value })
          }
          className="form-input"
        >
          {userDecks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      )}

      {(value.kind === "new" || !hasExisting) && (
        <input
          type="text"
          placeholder="název nového decku…"
          value={newTitle}
          onChange={(e) => {
            setNewTitle(e.target.value);
            onChange({ kind: "new", title: e.target.value });
          }}
          autoFocus={value.kind === "new" && !hasExisting}
          className="form-input"
        />
      )}
    </div>
  );
}

export function defaultDeckTarget(userDecks: Deck[]): DeckTarget {
  if (userDecks.length > 0) return { kind: "existing", deckId: userDecks[0].id };
  return { kind: "new", title: "" };
}
