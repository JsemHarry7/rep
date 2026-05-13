import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { Collection, Deck } from "@/types";
import { pathToView } from "@/App";
import { useCombinedContent } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { resolveCollection } from "@/lib/collections";
import { ThemeToggle } from "./ThemeToggle";
import { VersionStamp } from "./VersionStamp";

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { decks } = useCombinedContent();
  const collections = useAppStore((s) => s.collections);
  const activeView = pathToView(location);

  // For deck list highlighting: parse deckId from path if present.
  const deckMatch = location.match(/^\/decks\/(.+?)(\/|$)/);
  const activeDeckId = deckMatch ? decodeURIComponent(deckMatch[1]) : null;

  // Group decks by collection membership for the sidebar tree. Decks
  // not in any collection live under an "ostatní" bucket so they
  // remain reachable; this prevents the flat-list sprawl complaint
  // ("v levem navbaru ... zacina byt slozity, kdyz tam je tech decks
  // tolik"). Each collection becomes a collapsible disclosure group.
  const groups = useMemo(() => {
    const membership = new Map<string, Collection[]>(); // deckId → list of colls it belongs to
    for (const c of collections) {
      const members = resolveCollection(c, decks);
      for (const d of members) {
        const arr = membership.get(d.id) ?? [];
        arr.push(c);
        membership.set(d.id, arr);
      }
    }
    const grouped: { coll: Collection | null; decks: Deck[] }[] = [];
    for (const c of collections) {
      const members = resolveCollection(c, decks);
      if (members.length > 0) grouped.push({ coll: c, decks: members });
    }
    const ungrouped = decks.filter((d) => !membership.has(d.id));
    if (ungrouped.length > 0 || collections.length === 0) {
      grouped.push({ coll: null, decks: ungrouped });
    }
    return grouped;
  }, [decks, collections]);

  // Persist open/closed state in memory per session. Default: all open
  // if ≤ 3 collections, otherwise all collapsed (overwhelm protection).
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    collections.length > 3 ? new Set(collections.map((c) => c.id)) : new Set(),
  );
  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      className="
        hidden md:flex flex-col
        w-64 shrink-0
        bg-chrome text-chrome-fg
        border-r border-chrome-line
      "
    >
      <div className="px-5 pt-5 pb-4 border-b border-chrome-line flex items-baseline gap-3">
        <button
          onClick={() => navigate("/home")}
          className="flex items-baseline gap-3 group"
          aria-label="rep — home"
        >
          <span className="data text-2xl font-semibold lowercase tracking-tight text-chrome-fg leading-none">
            r
            <sup className="text-[0.55em] font-medium relative -top-[1em] ml-[0.05em]">
              n
            </sup>
          </span>
          <span className="data text-sm font-medium lowercase tracking-tight text-chrome-fg-dim leading-none">
            rep
          </span>
        </button>
        <div className="ml-auto">
          <VersionStamp tone="chrome" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <SidebarSection label="nav">
          <SidebarItem
            label="home"
            active={activeView === "home"}
            onClick={() => navigate("/home")}
          />
          <SidebarItem
            label="decks"
            active={activeView === "decks" && activeDeckId === null}
            onClick={() => navigate("/decks")}
          />
          <SidebarItem
            label="add cards"
            active={activeView === "add"}
            onClick={() => navigate("/add")}
          />
          <SidebarItem
            label="stats"
            active={activeView === "stats"}
            onClick={() => navigate("/stats")}
          />
          <SidebarItem
            label="settings"
            active={activeView === "settings"}
            onClick={() => navigate("/settings")}
          />
        </SidebarSection>

        <SidebarSection label="decks">
          {decks.length === 0 && (
            <li className="px-5 py-1 prose text-sm text-chrome-fg-muted italic">
              žádné decky
            </li>
          )}

          {groups.map(({ coll, decks: groupDecks }) => {
            const key = coll?.id ?? "_ungrouped";
            const isCollapsed = collapsed.has(key);
            // If there's a single ungrouped bucket and no collections,
            // skip the disclosure header — render flat as before.
            const showHeader = coll !== null || groups.length > 1;
            return (
              <li key={key} className="mb-1">
                {showHeader && (
                  <button
                    onClick={() => toggle(key)}
                    className="
                      w-full text-left px-5 py-1
                      flex items-center gap-2
                      data text-[10px] uppercase tracking-widest
                      text-chrome-fg-muted hover:text-chrome-fg
                      transition-colors
                    "
                    aria-expanded={!isCollapsed}
                  >
                    <span
                      aria-hidden
                      className="w-2 shrink-0 tabular-nums"
                    >
                      {isCollapsed ? "▸" : "▾"}
                    </span>
                    <span className="truncate">
                      {coll === null
                        ? "ostatní"
                        : coll.title}
                    </span>
                    <span className="ml-auto tabular-nums opacity-60">
                      {groupDecks.length}
                    </span>
                    {coll?.kind === "tag" && (
                      <span aria-hidden className="opacity-60">#</span>
                    )}
                  </button>
                )}
                {!isCollapsed && (
                  <ul>
                    {groupDecks.map((d) => (
                      <li key={d.id}>
                        <button
                          onClick={() => navigate(`/decks/${encodeURIComponent(d.id)}`)}
                          className={`
                            w-full text-left
                            ${showHeader ? "pl-9 pr-5" : "px-5"} py-1.5
                            flex items-baseline gap-2
                            transition-colors
                            ${
                              activeDeckId === d.id
                                ? "text-chrome-fg"
                                : "text-chrome-fg-dim hover:text-chrome-fg"
                            }
                          `}
                        >
                          <span
                            aria-hidden
                            className={`
                              data text-[10px] w-2 shrink-0
                              ${activeDeckId === d.id ? "text-chrome-fg" : "text-chrome-fg-muted"}
                            `}
                          >
                            {activeDeckId === d.id ? "›" : "·"}
                          </span>
                          <span className="data text-sm truncate">{d.title}</span>
                          {d.source === "local" && (
                            <span className="ml-auto data text-[9px] uppercase tracking-widest text-chrome-fg-muted">
                              local
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </SidebarSection>
      </nav>

      <div className="px-5 py-4 border-t border-chrome-line flex items-center justify-between">
        <VersionStamp tone="chrome" />
        <ThemeToggle />
      </div>
    </aside>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="px-5 pb-2 data text-[10px] uppercase tracking-widest text-chrome-fg-muted">
        {label}
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`
          w-full text-left px-5 py-1.5
          flex items-baseline gap-2
          transition-colors
          ${
            active
              ? "text-chrome-fg"
              : "text-chrome-fg-dim hover:text-chrome-fg"
          }
        `}
      >
        <span
          aria-hidden
          className={`data text-[10px] w-2 shrink-0 ${active ? "text-chrome-fg" : "text-chrome-fg-muted"}`}
        >
          {active ? "›" : "·"}
        </span>
        <span className="data text-sm">{label}</span>
      </button>
    </li>
  );
}
