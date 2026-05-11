import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, , toggle] = useTheme();

  return (
    <button
      onClick={toggle}
      title={`switch to ${theme === "light" ? "dark" : "light"}`}
      className="
        data
        text-[10px] uppercase tracking-widest
        text-chrome-fg-muted hover:text-chrome-fg
        transition-colors
        flex items-center gap-1.5
      "
    >
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full bg-current"
      />
      <span>{theme}</span>
    </button>
  );
}
