import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Une erreur est survenue",
  description = "Impossible de charger les données. Vérifiez votre connexion et réessayez.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/50 px-6 py-12 text-center dark:border-red-950 dark:bg-red-950/30",
        className,
      )}
    >
      <AlertCircle className="mb-3 size-10 text-red-500" aria-hidden />
      <h3 className="text-base font-semibold tracking-tight text-red-900 dark:text-red-200">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-red-700 dark:text-red-300">
        {description}
      </p>
      {onRetry ? (
        <Button variant="outline" className="mt-4" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
