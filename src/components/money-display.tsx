import { type Money, formatMoney } from "@/lib/money";
import { PIVOT_CURRENCY, toPivot } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  money: Money;
  /** Show the equivalent in pivot currency (FCFA) underneath when source ≠ pivot. */
  showPivotEquivalent?: boolean;
  /** Pivot conversion rate to apply (defaults to standard rate). */
  rateToPivot?: number;
  className?: string;
  size?: "sm" | "base" | "lg" | "xl";
}

const SIZE_CLASSES: Record<NonNullable<MoneyDisplayProps["size"]>, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-2xl font-semibold",
};

export function MoneyDisplay({
  money,
  showPivotEquivalent = true,
  rateToPivot,
  className,
  size = "base",
}: MoneyDisplayProps) {
  const isPivot = money.currency === PIVOT_CURRENCY;
  const showEquivalent = showPivotEquivalent && !isPivot;
  const equivalent = showEquivalent ? toPivot(money, rateToPivot) : null;

  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className={cn("tabular-nums", SIZE_CLASSES[size])}>
        {formatMoney(money)}
      </span>
      {equivalent ? (
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          ≈ {formatMoney(equivalent)}
        </span>
      ) : null}
    </span>
  );
}
