import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LoanForm } from "@/components/forms/loan-form";

export default function NewLoanPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/loans"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Prêts &amp; dettes
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouveau prêt
        </h2>
      </div>
      <LoanForm />
    </div>
  );
}
