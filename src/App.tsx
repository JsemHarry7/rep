import { useEffect, useMemo } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { MobileTabs } from "@/components/MobileTabs";
import { DeckList } from "@/components/DeckList";
import { DeckDetail } from "@/components/DeckDetail";
import { ReviewScreen } from "@/components/review/ReviewScreen";
import { AddCardsPage } from "@/components/add/AddCardsPage";
import { StatsPage } from "@/components/stats/StatsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { LandingPage } from "@/components/landing/LandingPage";
import { AboutPage } from "@/components/about/AboutPage";
import { ShareReceivePage } from "@/components/share/ShareReceivePage";
import { Tour } from "@/components/tour/Tour";
import { Button } from "@/components/ui/Button";
import { useCombinedContent } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import type { ReviewMode } from "@/types";

// useEffect imported above is used by route wrappers for redirect-when-deck-missing.
void useEffect;

/* ---------- URL → view labels (for nav highlights) ---------- */
export type AppView = "home" | "decks" | "add" | "stats" | "settings";

export function pathToView(path: string): AppView | null {
  if (path === "/home") return "home";
  if (path === "/decks" || path.startsWith("/decks/")) return "decks";
  if (path === "/add") return "add";
  if (path === "/stats") return "stats";
  if (path === "/settings") return "settings";
  return null;
}

/* ---------- Root ---------- */
export function App() {
  return (
    <Switch>
      <Route path="/">
        <LandingPage />
      </Route>
      <Route path="/about">
        <AboutPage />
      </Route>
      <Route path="/share">
        <ShareReceivePage />
      </Route>
      <Route>
        <AppShell />
      </Route>
    </Switch>
  );
}

/* ---------- Authenticated shell (everything but landing/about) ---------- */
function AppShell() {
  const [location] = useLocation();
  const inReview = location.startsWith("/review/");
  const tourOpen = useAppStore((s) => s.tourOpen);
  const closeTour = useAppStore((s) => s.closeTour);
  const updateUser = useAppStore((s) => s.updateUser);

  return (
    <div className="h-full min-h-dvh flex flex-col bg-surface overflow-hidden">
      {!inReview && <MobileTopBar />}

      <div className="flex-1 flex min-h-0 bg-surface">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-surface [scrollbar-gutter:stable]">
          <Switch>
            <Route path="/home">
              <DashboardPage />
            </Route>
            <Route path="/decks">
              <DeckListRoute />
            </Route>
            <Route path="/decks/:id">
              {(params) => <DeckDetailRoute id={params.id!} />}
            </Route>
            <Route path="/review/:deckId/:mode">
              {(params) => (
                <ReviewRoute
                  deckId={params.deckId!}
                  mode={params.mode as ReviewMode}
                />
              )}
            </Route>
            <Route path="/mock">
              <MockRoute />
            </Route>
            <Route path="/add">
              <AddCardsPage />
            </Route>
            <Route path="/stats">
              <StatsPage />
            </Route>
            <Route path="/settings">
              <SettingsPage />
            </Route>
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </main>
      </div>

      {!inReview && <MobileTabs />}
      <StatusBar />

      {tourOpen && (
        <Tour
          onComplete={() => {
            updateUser({ tourSeen: true });
            closeTour();
          }}
        />
      )}
    </div>
  );
}

/* ---------- Route wrappers ---------- */

function DeckListRoute() {
  const [, navigate] = useLocation();
  const { decks, cards } = useCombinedContent();
  return (
    <DeckList
      decks={decks}
      cards={cards}
      onSelectDeck={(id) => navigate(`/decks/${encodeURIComponent(id)}`)}
    />
  );
}

function DeckDetailRoute({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const { decks, cards } = useCombinedContent();
  const decodedId = decodeURIComponent(id);
  const deck = decks.find((d) => d.id === decodedId);
  const deckCards = deck ? cards.filter((c) => c.deckId === deck.id) : [];

  useEffect(() => {
    if (!deck) navigate("/decks", { replace: true });
  }, [deck, navigate]);

  if (!deck) return null;

  return (
    <DeckDetail
      deck={deck}
      cards={deckCards}
      onBack={() => navigate("/decks")}
      onStartReview={(mode) =>
        navigate(`/review/${encodeURIComponent(deck.id)}/${mode}`)
      }
    />
  );
}

function ReviewRoute({ deckId, mode }: { deckId: string; mode: ReviewMode }) {
  const [, navigate] = useLocation();
  const { decks, cards } = useCombinedContent();
  const decodedId = decodeURIComponent(deckId);
  const deck = decks.find((d) => d.id === decodedId);
  const deckCards = deck ? cards.filter((c) => c.deckId === deck.id) : [];

  useEffect(() => {
    if (!deck) navigate("/decks", { replace: true });
  }, [deck, navigate]);

  if (!deck) return null;

  return (
    <ReviewScreen
      deck={deck}
      cards={deckCards}
      mode={mode}
      onExit={() => navigate(`/decks/${encodeURIComponent(deck.id)}`)}
    />
  );
}

function MockRoute() {
  const [, navigate] = useLocation();
  const { cards } = useCombinedContent();

  // Snapshot a random subset once on mount; user can re-roll by re-entering route.
  const sample = useMemo(() => {
    const shuffled = cards.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sample.length === 0) navigate("/decks", { replace: true });
  }, [sample, navigate]);

  if (sample.length === 0) return null;

  const virtualDeck = {
    id: "_mock",
    title: "Mock exam",
    description: "Náhodný výběr napříč decky · simulace zkoušky",
    tags: ["mock"],
    source: "builtin" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return (
    <ReviewScreen
      deck={virtualDeck}
      cards={sample}
      mode="mock"
      onExit={() => navigate("/home")}
    />
  );
}

function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <div className="data text-[10px] uppercase tracking-widest text-accent mb-4">
        404 · ztraceno v lese
      </div>
      <h1 className="display text-5xl sm:text-7xl mb-4">
        <span className="italic">Tady nic není.</span>
      </h1>
      <p className="prose text-base text-ink-dim mb-8 max-w-prose">
        Buď je adresa špatně napsaná, nebo jsem zapomněl tu stránku
        postavit. Druhá možnost je pravděpodobnější.
      </p>
      <Button onClick={() => navigate("/home")} variant="primary">
        ← Zpět domů
      </Button>
    </div>
  );
}
