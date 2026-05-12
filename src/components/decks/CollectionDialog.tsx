/* ---------- CollectionDialog ----------
 *
 * Create / edit a Collection. Two modes:
 *   • manual   checklist of decks; result is a fixed list of IDs
 *   • tag      single tag string; membership computed at read time,
 *              so adding the tag to a new deck pulls it in automatically
 *
 * Tag input has a datalist-backed dropdown of all existing tags so the
 * user can browse alphabetically without remembering exact spelling,
 * but free-text entry is allowed (so "create a tag-mode collection
 * for a tag you haven't applied yet" still works).
 */

import { useMemo, useState } from "react";
import type { Collection, Deck, DeckId } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { allTags } from "@/lib/collections";

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, dialog opens in edit mode pre-filled with this collection. */
  editing?: Collection | null;
  allDecks: Deck[];
}

type Mode = "manual" | "tag";

export function CollectionDialog({ open, onClose, editing, allDecks }: Props) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Upravit "${editing.title}"` : "Nová kolekce"}
      maxWidth="max-w-2xl"
    >
      {/* Remount on `editing` change so form state resets cleanly. */}
      <DialogBody
        key={editing?.id ?? "create"}
        editing={editing ?? null}
        allDecks={allDecks}
        onClose={onClose}
      />
    </Modal>
  );
}

function DialogBody({
  editing,
  allDecks,
  onClose,
}: {
  editing: Collection | null;
  allDecks: Deck[];
  onClose: () => void;
}) {
  const createCollection = useAppStore((s) => s.createCollection);
  const updateCollection = useAppStore((s) => s.updateCollection);
  const deleteCollection = useAppStore((s) => s.deleteCollection);

  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [mode, setMode] = useState<Mode>(editing?.kind ?? "manual");
  const [deckIds, setDeckIds] = useState<Set<DeckId>>(
    new Set(editing?.kind === "manual" ? editing.deckIds : []),
  );
  const [tag, setTag] = useState(editing?.kind === "tag" ? editing.tag : "");
  const [deckFilter, setDeckFilter] = useState("");

  const tags = useMemo(() => allTags(allDecks), [allDecks]);

  const filteredDecks = useMemo(() => {
    const q = deckFilter.trim().toLowerCase();
    if (!q) return allDecks;
    return allDecks.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [allDecks, deckFilter]);

  // Live preview of tag-mode membership.
  const tagPreview = useMemo(() => {
    const t = tag.trim();
    if (!t) return [];
    return allDecks.filter((d) => d.tags?.includes(t));
  }, [tag, allDecks]);

  const toggleDeck = (id: DeckId) => {
    const next = new Set(deckIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDeckIds(next);
  };

  const canSave =
    title.trim().length > 0 &&
    (mode === "manual" ? deckIds.size > 0 : tag.trim().length > 0);

  const handleSave = () => {
    if (!canSave) return;
    if (editing) {
      updateCollection(editing.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        ...(mode === "manual"
          ? { kind: "manual", deckIds: [...deckIds] }
          : { kind: "tag", tag: tag.trim() }),
      } as Partial<Collection>);
    } else {
      if (mode === "manual") {
        createCollection({
          kind: "manual",
          title: title.trim(),
          description: description.trim() || undefined,
          deckIds: [...deckIds],
        });
      } else {
        createCollection({
          kind: "tag",
          title: title.trim(),
          description: description.trim() || undefined,
          tag: tag.trim(),
        });
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (!editing) return;
    if (!confirm(`Smazat kolekci "${editing.title}"?\n\nDecky uvnitř zůstanou — mizí jen tato kolekce.`)) {
      return;
    }
    deleteCollection(editing.id);
    onClose();
  };

  return (
    <div className="space-y-5">
      <Field label="název">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="např. Maturita ústní"
          className="form-input"
          autoFocus
        />
      </Field>

      <Field label="popis (volitelný)">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="krátká poznámka"
          className="form-input"
          maxLength={200}
        />
      </Field>

      <div>
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-2">
          jak vybrat decky
        </div>
        <div
          className="
            hairline rounded-md
            grid grid-cols-2
            divide-x divide-line
            overflow-hidden
            bg-surface-elev
          "
        >
          <ModeButton active={mode === "manual"} onClick={() => setMode("manual")}>
            <div className="data text-sm font-semibold">Ručně</div>
            <div className="prose text-xs text-ink-dim">
              checklist · stabilní seznam
            </div>
          </ModeButton>
          <ModeButton active={mode === "tag"} onClick={() => setMode("tag")}>
            <div className="data text-sm font-semibold">Podle tagu</div>
            <div className="prose text-xs text-ink-dim">
              dynamicky · nový deck s tagem se přidá automaticky
            </div>
          </ModeButton>
        </div>
      </div>

      {mode === "manual" && (
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
            <div className="data text-[10px] uppercase tracking-widest text-ink-muted">
              decky ({deckIds.size} vybráno)
            </div>
            <input
              type="text"
              value={deckFilter}
              onChange={(e) => setDeckFilter(e.target.value)}
              placeholder="hledat…"
              className="form-input data text-xs max-w-xs"
            />
          </div>
          <div className="hairline rounded-md bg-surface-elev max-h-72 overflow-y-auto">
            {filteredDecks.length === 0 ? (
              <div className="p-4 data text-xs uppercase tracking-widest text-ink-muted">
                žádné odpovídající decky
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {filteredDecks.map((d) => {
                  const checked = deckIds.has(d.id);
                  return (
                    <li key={d.id}>
                      <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDeck(d.id)}
                          className="size-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="prose text-sm text-ink truncate">
                            {d.title}
                          </div>
                          {(d.tags?.length ?? 0) > 0 && (
                            <div className="data text-[10px] uppercase tracking-widest text-ink-muted truncate">
                              {(d.tags ?? []).map((t) => `#${t}`).join(" ")}
                            </div>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {mode === "tag" && (
        <div>
          <Field label="tag">
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="napiš nebo vyber tag"
              list="rep-tag-list"
              className="form-input"
            />
            <datalist id="rep-tag-list">
              {tags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          {tags.length > 0 && (
            <div className="mt-3">
              <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-2">
                existující tagy
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className={`
                      data text-[11px] uppercase tracking-widest
                      px-2.5 py-1 rounded-sm hairline
                      transition-colors min-h-[28px]
                      ${
                        tag.trim() === t
                          ? "border-navy bg-navy text-navy-fg"
                          : "text-ink-dim hover:border-line-strong hover:text-ink"
                      }
                    `}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tag.trim() && (
            <p className="prose text-xs text-ink-dim mt-3">
              Kolekce bude obsahovat{" "}
              <span className="data text-ink">{tagPreview.length}</span>{" "}
              {tagPreview.length === 1
                ? "deck"
                : tagPreview.length < 5 && tagPreview.length > 0
                  ? "decky"
                  : "decků"}{" "}
              s tagem <span className="data">#{tag.trim()}</span>.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-line">
        {editing ? (
          <button
            onClick={handleDelete}
            className="
              data text-[11px] uppercase tracking-widest
              text-ink-muted hover:text-bad transition-colors
              px-3 py-2 min-h-[40px]
            "
          >
            ✕ smazat kolekci
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button onClick={onClose} variant="ghost" size="sm">
            Zrušit
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            variant="primary"
            size="sm"
          >
            {editing ? "Uložit" : "Vytvořit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        text-left p-4 transition-colors
        ${active ? "bg-surface" : "hover:bg-surface"}
      `}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">
        {label}
      </div>
      {children}
    </label>
  );
}
