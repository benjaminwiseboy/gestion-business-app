import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InvestmentForm } from "@/components/forms/investment-form";

export default function NewInvestmentPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/investments"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Investissements
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouvel investissement
        </h2>
      </div>
      <InvestmentForm />
    </div>
  );
}
