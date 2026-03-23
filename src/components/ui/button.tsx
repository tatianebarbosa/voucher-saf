import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white shadow-[0_18px_40px_-24px_rgba(191,31,41,0.7)] hover:bg-[var(--color-primary-strong)]",
  secondary:
    "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]",
  ghost:
    "rounded-[var(--radius-md)] bg-transparent text-[var(--color-muted-foreground)] hover:bg-white/70 hover:text-[var(--color-foreground)]",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
