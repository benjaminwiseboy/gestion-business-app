import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminFileForm } from "@/components/forms/admin-file-form";

export default function NewAdminFilePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin-files"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Dossiers
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouveau dossier
        </h2>
      </div>
      <AdminFileForm />
    </div>
  );
}
