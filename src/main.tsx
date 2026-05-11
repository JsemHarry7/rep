import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { initTheme } from "@/lib/theme";
import { App } from "./App";

// Set data-theme before React renders to avoid a flash on cold load.
initTheme();

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
  /* eslint-enable no-console */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
