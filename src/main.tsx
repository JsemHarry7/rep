import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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

// GoogleOAuthProvider used to wrap the whole tree here, but that loads
// accounts.google.com/gsi/client (~98 KB + 21 third-party cookies) on
// every cold visit. The provider is now mounted lazily inside CloudSync
// — the only consumer of the script — so Landing / Dashboard / Review /
// etc. never pay that cost.
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
