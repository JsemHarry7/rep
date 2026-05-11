import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/* ---------- Button ----------
 *
 * Border-only style with color flip on hover. Less "web-app filled
 * pill", more "editorial considered". Sharp corners (rounded-sm = 2px).
 *
 * Variants:
 *   primary    navy border + navy text → hover fills navy
 *   secondary  line border + ink text  → hover deepens border + lifts bg
 *   ghost      text-only               → hover shifts to accent
 *   danger     bad border + bad text   → hover fills bad
 *
 * Typography: Inter sans, normal case, medium weight. Buttons read as
 * actions, distinct from the all-mono uppercase chrome elsewhere.
 */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-medium transition-colors select-none disabled:opacity-40 disabled:cursor-not-allowed";

  const sizing: Record<Size, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2 text-sm",
    lg: "px-7 py-3 text-base",
  };

  const variants: Record<Variant, string> = {
    primary:
      "border border-navy bg-transparent text-navy hover:bg-navy hover:text-navy-fg",
    secondary:
      "border border-line bg-transparent text-ink hover:border-line-strong hover:bg-surface-elev",
    ghost: "border border-transparent text-ink-dim hover:text-accent",
    danger:
      "border border-bad bg-transparent text-bad hover:bg-bad hover:text-navy-fg",
  };

  return (
    <button
      {...props}
      className={`${base} ${sizing[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
