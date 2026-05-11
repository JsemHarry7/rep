import { useState } from "react";
import { AGENT_SPEC_MD, AGENT_SPEC_FILENAME } from "@/lib/agentSpec";
import { Button } from "@/components/ui/Button";

export function AgentInstructions() {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([AGENT_SPEC_MD], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = AGENT_SPEC_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_SPEC_MD);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for non-HTTPS dev: trigger download instead.
      handleDownload();
    }
  };

  return (
    <section className="hairline rounded-md p-4 sm:p-5 bg-surface-elev">
      <div className="flex items-start gap-3 mb-3">
        <div className="data text-[10px] uppercase tracking-widest text-ink-muted shrink-0 mt-1">
          AI agent
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="data text-sm font-semibold text-ink mb-1">
            Instrukce pro agentic AI
          </h3>
          <p className="prose text-sm text-ink-dim">
            Stáhni si{" "}
            <span className="data">{AGENT_SPEC_FILENAME}</span> a předej
            Claude Code, Codex, Gemini nebo jinému agentic AI spolu se
            zdrojovým materiálem. Vrátí ti{" "}
            <span className="data">.md</span> soubor v naší konvenci,
            který přetáhneš do drop zóny pod tímto.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleDownload} variant="primary" size="sm">
          <span aria-hidden>↓</span> Stáhnout {AGENT_SPEC_FILENAME}
        </Button>
        <Button onClick={handleCopy} variant="secondary" size="sm">
          {copied ? "Zkopírováno ✓" : "Kopírovat do schránky"}
        </Button>
      </div>
    </section>
  );
}
