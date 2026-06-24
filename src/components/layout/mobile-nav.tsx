"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Header mobile (md:hidden) avec bouton hamburger qui ouvre un drawer
 * latéral gauche contenant la nav complète. Sur desktop, c'est la Sidebar
 * fixe qui gère la navigation.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-3 md:hidden dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="-ml-1 inline-flex size-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Gestion Business
        </Link>
      </header>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            className="fixed inset-0 z-50 bg-black/40 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          />
          <DialogPrimitive.Popup
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl outline-none duration-200 ease-out data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <DialogPrimitive.Title className="text-sm font-semibold tracking-tight">
                Gestion Business
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Fermer le menu"
                className="-mr-1 inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
