import { lazy, Suspense, useEffect, useMemo } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { MobileTabs } from "@/components/MobileTabs";
import { useCombinedContent } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { useCloudAuth } from "@/lib/cloudAuth";
import { startAutoSync } from "@/lib/autoSync";
import { resolveCollection } from "@/lib/collections";
import type { ReviewMode } from "@/types";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Eagerly loaded: chrome that's always present.
// Lazily loaded: every route page + the walkthrough overlay. Cuts the
// initial bundle by ~40% so first paint is faster on slow networks.
const LandingPage = lazy(() =>
  import("@/components/landing/LandingPage").then((m) => ({
    default: m.LandingPage,
  })),
);
const AboutPage = lazy(() =>
  import("@/components/about/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const ShareReceivePage = lazy(() =>
  import("@/components/share/ShareReceivePage").then((m) => ({
    default: m.ShareReceivePage,
  })),
);
const DashboardPage = lazy(() =>
  import("@/components/dashboard/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
const DeckList = lazy(() =>
  import("@/components/DeckList").then((m) => ({ default: m.DeckList })),
);
const DeckDetail = lazy(() =>
  import("@/components/DeckDetail").then((m) => ({ default: m.DeckDetail })),
);
const ReviewScreen = lazy(() =>
  import("@/components/review/ReviewScreen").then((m) => ({
    default: m.ReviewScreen,
  })),
);
const AddCardsPage = lazy(() =>
  import("@/components/add/AddCardsPage").then((m) => ({
    default: m.AddCardsPage,
  })),
);
const StatsPage = lazy(() =>
  import("@/components/stats/StatsPage").then((m) => ({ default: m.StatsPage })),
);
const SettingsPage = lazy(() =>
  import("@/components/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const Tour = lazy(() =>
  import("@/components/tour/Tour").then((m) => ({ default: m.Tour })),
);

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
  // Bootstrap cloud sync once per app load. Only do anything if a Google
  // client ID was injected at build time — otherwise no backend, no need
  // to hit /api/auth/me on every cold open.
  useEffect(() => {
    if (!CLIENT_ID) return;
    const auth = useCloudAuth.getState();
    if (auth.status === "unknown") void auth.init();
    startAutoSync();
  }, []);

  return (
    <Suspense fallback={<RouteLoader />}>
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
        <Route path="/s/:id">
          {(params) => <ShareReceivePage shortId={params.id!} />}
        </Route>
        <Route>
          <AppShell />
        </Route>
      </Switch>
    </Suspense>
  );
}

/* ---------- Authenticated shell (everything but landing/about/share) ---------- */
function AppShell() {
  const [location] = useLocation();
  const inReview = location.startsWith("/review/");
  const tourOpen = useAppStore((s) => s.tourOpen);
  const closeTour = useAppStore((s) => s.closeTour);
  const updateUser = useAppStore((s) => s.updateUser);

  // Mobile chrome (top + bottom bars) is position:fixed so it survives
  // mobile-browser URL-bar collapse and on-screen keyboard shifts.
  // Fixed elements are positioned relative to the viewport, so the
  // outer container's overflow-hidden + h-full does NOT clip them —
  // we can keep the original internal-scroll layout (which is what
  // makes [scrollbar-gutter:stable] work and prevents body-level
  // scrollbars from shifting page width).
  //
  // The main element gets mobile-only top/bottom padding so its
  // content isn't hidden behind the fixed bars.
  const mobilePadding = inReview
    ? ""
    : "pt-[calc(44px+env(safe-area-inset-top))] pb-[calc(60px+env(safe-area-inset-bottom))] md:pt-0 md:pb-0";

  return (
    <div className="h-full min-h-dvh flex flex-col bg-surface overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus-visible-only focus:fixed focus:left-2 focus:top-2 focus:z-[200] focus:bg-navy focus:text-navy-fg focus:px-3 focus:py-2 focus:rounded-sm focus:text-sm"
      >
        Přeskočit na obsah
      </a>

      {!inReview && <MobileTopBar />}

      <div className="flex-1 flex min-h-0 bg-surface">
        <Sidebar />
        <main
          id="main-content"
          className={`flex-1 overflow-y-auto bg-surface [scrollbar-gutter:stable] ${mobilePadding}`}
        >
          <Suspense fallback={<RouteLoader />}>
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
              <Route path="/review/c/:colId/:mode">
                {(params) => (
                  <CollectionReviewRoute
                    colId={params.colId!}
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
          </Suspense>
        </main>
      </div>

      {!inReview && <MobileTabs />}
      <StatusBar />

      {tourOpen && (
        <Suspense fallback={null}>
          <Tour
            onComplete={() => {
              updateUser({ tourSeen: true });
              closeTour();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

/* ---------- Suspense fallback ----------
 * Minimal — quiet surface with a small pulse, only visible if the chunk
 * actually takes >50ms to load. */
function RouteLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[60vh] flex items-center justify-center"
    >
      <span className="data text-[10px] uppercase tracking-widest text-ink-muted animate-pulse">
        načítám…
      </span>
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

function CollectionReviewRoute({
  colId,
  mode,
}: {
  colId: string;
  mode: ReviewMode;
}) {
  const [, navigate] = useLocation();
  const { decks, cards } = useCombinedContent();
  const collections = useAppStore((s) => s.collections);

  const decodedId = decodeURIComponent(colId);
  const collection = collections.find((c) => c.id === decodedId);

  useEffect(() => {
    if (!collection) navigate("/decks", { replace: true });
  }, [collection, navigate]);

  if (!collection) return null;

  const memberDecks = resolveCollection(collection, decks);
  const deckIds = new Set(memberDecks.map((d) => d.id));
  const collectionCards = cards.filter((c) => deckIds.has(c.deckId));

  // Build a virtual deck for the review screen — wraps the entire
  // collection so the existing review flow works unchanged.
  const virtualDeck = {
    id: `_col_${collection.id}`,
    title: collection.title,
    description:
      collection.description ??
      `${memberDecks.length} decků v kolekci`,
    tags: collection.kind === "tag" ? [collection.tag] : [],
    source: "builtin" as const,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };

  if (collectionCards.length === 0) {
    return (
      <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-3xl mx-auto">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted mb-4">
          kolekce · prázdná
        </div>
        <h1 className="display text-5xl sm:text-6xl mb-4">
          <span className="italic">{collection.title}</span> nemá karty.
        </h1>
        <p className="prose text-base text-ink-dim mb-8">
          Žádný z decků v kolekci zatím nemá karty. Přidej nějaké a vrať se
          sem.
        </p>
        <button
          onClick={() => navigate("/decks")}
          className="
            inline-flex items-center gap-2
            border border-navy bg-transparent text-navy
            px-5 py-2 rounded-sm font-sans text-sm font-medium
            hover:bg-navy hover:text-navy-fg transition-colors
          "
        >
          ← Zpět na decks
        </button>
      </div>
    );
  }

  return (
    <ReviewScreen
      deck={virtualDeck}
      cards={collectionCards}
      mode={mode}
      onExit={() => navigate("/decks")}
    />
  );
}

function MockRoute() {
  const [, navigate] = useLocation();
  const { cards } = useCombinedContent();

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
      <button
        onClick={() => navigate("/home")}
        className="
          inline-flex items-center justify-center gap-2
          border border-navy bg-transparent text-navy
          px-5 py-2 rounded-sm
          font-sans text-sm font-medium
          hover:bg-navy hover:text-navy-fg
          transition-colors
        "
      >
        ← Zpět domů
      </button>
    </div>
  );
}
