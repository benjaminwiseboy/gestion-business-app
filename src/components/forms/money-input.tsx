"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CurrencyCode, money, type Money } from "@/lib/money";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  value: Money | null;
  onChange: (value: Money | null) => void;
  currencies?: CurrencyCode[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const DEFAULT_CURRENCIES: CurrencyCode[] = ["XOF", "USD"];

export function MoneyInput({
  value,
  onChange,
  currencies = DEFAULT_CURRENCIES,
  placeholder = "0",
  disabled,
  className,
  "aria-label": ariaLabel,
}: MoneyInputProps) {
  const id = useId();
  const currentCurrency: CurrencyCode = value?.currency ?? currencies[0];
  const currentAmount = value?.amount.toString() ?? "";

  function handleAmountChange(raw: string) {
    const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
    if (cleaned === "" || cleaned === "-") {
      onChange(null);
      return;
    }
    try {
      onChange(money(cleaned, currentCurrency));
    } catch {
      // Invalid number — keep last valid state
    }
  }

  function handleCurrencyChange(next: CurrencyCode | null) {
    if (!next) return;
    if (value) {
      onChange(money(value.amount, next));
    }
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={currentAmount}
        onChange={(e) => handleAmountChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel ?? "Montant"}
        className="flex-1 tabular-nums"
      />
      <Select
        value={currentCurrency}
        onValueChange={handleCurrencyChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-24" aria-label="Devise">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((c) => (
            <SelectItem key={c} value={c}>
              {c === "XOF" ? "FCFA" : c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
