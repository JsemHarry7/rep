import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import { initTheme } from "@/lib/theme";
import { App } from "./App";

// Set data-theme before React renders to avoid a flash on cold load.
initTheme();

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Boot banner.
if (typeof console !== "undefined") {
  /* eslint-disable no-console */
  console.log(
    "%c rⁿ rep ",
    "font: 600 16px ui-monospace, SF Mono, Menlo, monospace; color: #f8fafc; background: #1f2b44; padding: 4px 10px; border-radius: 2px;",
  );
  console.log(
    "%ccrafted by harry · maturita 2026",
    "color: #c97f5a; font-style: italic; font-size: 12px;",
  );
  console.log(
    "%charrydeiml.ing · kontakt@harrydeiml.ing",
    "color: #94a3b8; font-size: 11px;",
  );
  if (!GOOGLE_CLIENT_ID) {
    console.log(
      "%cVITE_GOOGLE_CLIENT_ID is not set — cloud sync disabled",
      "color: #94a3b8; font-size: 11px;",
    );
  }
  /* eslint-enable no-console */
}

const root = createRoot(document.getElementById("root")!);

const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Only wrap with GoogleOAuthProvider if a client id was injected at
// build time. Without it, the provider would crash; we'd rather render
// the rest of the app and let CloudSync show a "not configured" state.
root.render(
  GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  ),
);
