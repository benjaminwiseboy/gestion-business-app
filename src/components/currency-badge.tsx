import { Badge } from "@/components/ui/badge";
import type { CurrencyCode } from "@/lib/money";

const LABEL: Record<CurrencyCode, string> = {
  XOF: "FCFA",
  USD: "USD",
};

export function CurrencyBadge({ currency }: { currency: CurrencyCode }) {
  return (
    <Badge variant="secondary" className="text-[10px] tracking-wide uppercase">
      {LABEL[currency]}
    </Badge>
  );
}
