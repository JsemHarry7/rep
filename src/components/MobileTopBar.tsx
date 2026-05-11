import { useLocation } from "wouter";
import { ThemeToggle } from "./ThemeToggle";

export function MobileTopBar() {
  const [, navigate] = useLocation();

  return (
    <header
      className="
        md:hidden
        bg-chrome border-b border-chrome-line
        px-5
        pt-[max(0.75rem,env(safe-area-inset-top))] pb-3
        flex items-center justify-between
        shrink-0
      "
    >
      <button
        onClick={() => navigate("/home")}
        className="flex items-baseline gap-3 -mx-2 px-2 py-1"
        aria-label="rep — home"
      >
        <span className="data text-xl font-semibold lowercase tracking-tight text-chrome-fg leading-none">
          r
          <sup className="text-[0.55em] font-medium relative -top-[1em] ml-[0.05em]">
            n
          </sup>
        </span>
        <span className="data text-xs font-medium lowercase tracking-tight text-chrome-fg-dim leading-none">
          rep
        </span>
        <span className="data text-[10px] uppercase tracking-widest text-chrome-fg-muted">
          v0.0.1
        </span>
      </button>
      <ThemeToggle />
    </header>
  );
}
