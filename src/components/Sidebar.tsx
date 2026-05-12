import { useLocation } from "wouter";
import type { Deck } from "@/types";
import { pathToView } from "@/App";
import { useCombinedContent } from "@/lib/data";
import { ThemeToggle } from "./ThemeToggle";
import { VersionStamp } from "./VersionStamp";

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { decks } = useCombinedContent();
  const activeView = pathToView(location);

  // For deck list highlighting: parse deckId from path if present.
  const deckMatch = location.match(/^\/decks\/(.+?)(\/|$)/);
  const activeDeckId = deckMatch ? decodeURIComponent(deckMatch[1]) : null;

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
          {decks.map((d: Deck) => (
            <li key={d.id}>
              <button
                onClick={() => navigate(`/decks/${encodeURIComponent(d.id)}`)}
                className={`
                  w-full text-left
                  px-5 py-1.5
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
