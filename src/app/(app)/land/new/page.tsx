import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LandProjectForm } from "@/components/forms/land-project-form";

export default function NewLandProjectPage() {
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
          Nouveau projet foncier
        </h2>
      </div>
      <LandProjectForm />
    </div>
  );
}
