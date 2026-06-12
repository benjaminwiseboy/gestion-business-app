"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Decimal from "decimal.js";
import { parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { CurrencyCode } from "@/lib/money";
import type { TransactionWithPerson } from "@/hooks/use-transactions";

interface MonthlyFlowChartProps {
  transactions: TransactionWithPerson[];
  usdRate: number;
}

type MonthDatum = {
  month: string;
  in: number;
  out: number;
};

const KIND_DIRECTION: Record<string, "in" | "out" | null> = {
  repayment: "in",
  loan_disbursement: "out",
  land_payment: "in",
  investment_in: "in",
  investment_out: "out",
  fee: "out",
  adjustment: null,
};

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

const xafFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XAF",
  maximumFractionDigits: 0,
});

export function MonthlyFlowChart({
  transactions,
  usdRate,
}: MonthlyFlowChartProps) {
  const data = useMemo<MonthDatum[]>(
    () => buildMonthly(transactions, usdRate, 6),
    [transactions, usdRate],
  );

  const hasData = data.some((d) => d.in !== 0 || d.out !== 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4">
        <h3 className="text-base font-semibold tracking-tight">
          Flux mensuels (FCFA)
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Entrées vs sorties sur les 6 derniers mois
        </p>
      </div>
      {!hasData ? (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700">
          Pas encore de données.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 4, left: -4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value) =>
                  Math.abs(value) >= 1_000_000
                    ? `${(value / 1_000_000).toFixed(1)}M`
                    : Math.abs(value) >= 1_000
                      ? `${Math.round(value / 1_000)}k`
                      : String(value)
                }
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === "number"
                    ? xafFormatter.format(value)
                    : String(value)
                }
                labelFormatter={(label) => `Mois : ${label}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="in"
                name="Entrées"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="out"
                name="Sorties"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function MonthlyFlowChartSkeleton() {
  return <Skeleton className="h-72 w-full" />;
}

function buildMonthly(
  transactions: TransactionWithPerson[],
  usdRate: number,
  monthsBack: number,
): MonthDatum[] {
  const now = new Date();
  const buckets = new Map<string, MonthDatum>();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      month: MONTH_LABELS[d.getMonth()],
      in: 0,
      out: 0,
    });
  }

  for (const tx of transactions) {
    const direction = KIND_DIRECTION[tx.kind];
    if (!direction) continue;
    const d = parseISO(tx.occurred_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const currency = tx.currency as CurrencyCode;
    const rate = currency === "USD" ? usdRate : 1;
    const xaf = new Decimal(tx.amount).mul(rate).toNumber();
    if (direction === "in") {
      bucket.in += xaf;
    } else {
      bucket.out += xaf;
    }
  }

  return Array.from(buckets.values());
}
