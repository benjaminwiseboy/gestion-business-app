import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PersonForm } from "@/components/forms/person-form";

export default function NewPersonPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/persons"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Personnes
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouvelle personne
        </h2>
      </div>
      <PersonForm />
    </div>
  );
}
