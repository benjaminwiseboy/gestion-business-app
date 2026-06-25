import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Status =
  | "active"
  | "repaid"
  | "partial"
  | "overdue"
  | "settled"
  | "blocked"
  | "processing"
  | "awaiting_docs"
  | "awaiting_payment"
  | "done"
  | "closed"
  | "lost"
  | "planned"
  | "owned";

const CONFIG: Record<Status, { label: string; className: string }> = {
  active: {
    label: "En cours",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  repaid: {
    label: "Remboursé",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  partial: {
    label: "Partiel",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  overdue: {
    label: "En retard",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  settled: {
    label: "Soldé",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  blocked: {
    label: "Bloqué",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  processing: {
    label: "En traitement",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  awaiting_docs: {
    label: "Attente docs",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  awaiting_payment: {
    label: "Attente paiement",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  done: {
    label: "Terminé",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  closed: {
    label: "Clôturé",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  lost: {
    label: "Perdu",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  planned: {
    label: "En cours d'acquisition",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  owned: {
    label: "Acquis",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const { label, className: variantClass } = CONFIG[status];
  return (
    <Badge variant="ghost" className={cn(variantClass, className)}>
      {label}
    </Badge>
  );
}
