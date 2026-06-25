import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LandForm } from "@/components/forms/land-form";

export default function NewLandPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/land"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Foncier
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouveau terrain
        </h2>
      </div>
      <LandForm />
    </div>
  );
}
