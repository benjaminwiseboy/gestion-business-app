import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ManualTransactionForm } from "@/components/forms/manual-transaction-form";

export default function NewTransactionPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Transactions
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouvelle dépense
        </h2>
      </div>
      <ManualTransactionForm />
    </div>
  );
}
