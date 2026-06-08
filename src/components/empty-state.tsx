import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700",
        className,
      )}
    >
      {Icon ? (
        <Icon className="mb-3 size-10 text-zinc-400" aria-hidden />
      ) : null}
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
      {action ? (
        <Button
          className="mt-4"
          size="sm"
          onClick={action.onClick}
          render={action.href ? <a href={action.href} /> : undefined}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
