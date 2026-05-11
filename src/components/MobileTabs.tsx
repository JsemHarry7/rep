import { useLocation } from "wouter";
import { pathToView, type AppView } from "@/App";

interface TabDef {
  id: AppView;
  label: string;
  path: string;
}

const tabs: TabDef[] = [
  { id: "home", label: "home", path: "/home" },
  { id: "decks", label: "decks", path: "/decks" },
  { id: "add", label: "add", path: "/add" },
  { id: "stats", label: "stats", path: "/stats" },
  { id: "settings", label: "prefs", path: "/settings" },
];

export function MobileTabs() {
  const [location, navigate] = useLocation();
  const activeView = pathToView(location);

  return (
    <nav
      className="
        md:hidden
        bg-chrome border-t border-chrome-line
        grid grid-cols-5
        pb-[env(safe-area-inset-bottom)]
        shrink-0
      "
    >
      {tabs.map((t) => {
        const active = activeView === t.id;
        return (
          <button
            key={t.id}
            onClick={() => navigate(t.path)}
            className={`
              relative
              py-3 px-1
              flex items-center justify-center
              min-h-[48px]
              data text-[10px] uppercase tracking-widest
              transition-colors
              ${active ? "text-chrome-fg" : "text-chrome-fg-muted"}
              active:bg-chrome-line
            `}
          >
            {active && (
              <span
                aria-hidden
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-px bg-chrome-fg"
              />
            )}
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
