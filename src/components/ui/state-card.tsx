import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  Inbox,
  LoaderCircle,
  SearchX,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StateCardTone = "loading" | "empty" | "search" | "error";

interface StateCardProps {
  title: string;
  description: string;
  tone?: StateCardTone;
  action?: ReactNode;
  className?: string;
}

const toneStyles: Record<StateCardTone, string> = {
  loading: "border-[var(--color-border)] bg-white/95 text-[var(--color-foreground)]",
  empty: "border-[var(--color-border)] bg-white/95 text-[var(--color-foreground)]",
  search: "border-[var(--color-border)] bg-white/95 text-[var(--color-foreground)]",
  error: "border-red-200 bg-red-50 text-red-950",
};

const toneIcons = {
  loading: LoaderCircle,
  empty: Inbox,
  search: SearchX,
  error: AlertTriangle,
} satisfies Record<StateCardTone, ComponentType<{ className?: string }>>;

export function StateCard({
  title,
  description,
  tone = "empty",
  action,
  className,
}: StateCardProps) {
  const Icon = toneIcons[tone];

  return (
    <Card className={cn(toneStyles[tone], className)}>
      <CardContent className="flex flex-col items-center gap-3 px-5 py-8 text-center">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-[8px]",
            tone === "error"
              ? "bg-red-100 text-red-700"
              : "bg-[var(--color-surface-muted)] text-[var(--color-primary)]",
          )}
        >
          <Icon
            className={cn(
              "size-5",
              tone === "loading" ? "animate-spin" : "",
            )}
          />
        </span>

        <div className="space-y-2">
          <h2 className="font-heading text-xl font-bold tracking-tight">
            {title}
          </h2>
          <p
            className={cn(
              "mx-auto max-w-2xl text-sm leading-6",
              tone === "error"
                ? "text-red-900/80"
                : "text-[var(--color-muted-foreground)]",
            )}
          >
            {description}
          </p>
        </div>

        {action ? <div className="flex flex-wrap justify-center gap-3">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
