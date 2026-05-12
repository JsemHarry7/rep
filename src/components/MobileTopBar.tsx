import { useLocation } from "wouter";
import { ThemeToggle } from "./ThemeToggle";
import { SyncIndicator } from "./SyncIndicator";
import { VersionStamp } from "./VersionStamp";

export function MobileTopBar() {
  const [, navigate] = useLocation();

  return (
    <header
      className="
        md:hidden
        fixed top-0 left-0 right-0 z-30
        bg-chrome border-b border-chrome-line
        px-5
        pt-[max(0.75rem,env(safe-area-inset-top))] pb-3
        flex items-center justify-between gap-3
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
      </button>
      <div className="flex items-center gap-3">
        <VersionStamp tone="chrome" />
        <SyncIndicator />
        <ThemeToggle />
      </div>
    </header>
  );
}
