"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const primary = NAV_ITEMS.filter((i) => i.inBottomNav);
  const overflow = NAV_ITEMS.filter((i) => !i.inBottomNav);
  const overflowActive = overflow.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-zinc-800 dark:bg-zinc-900"
    >
      {primary.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 px-2 text-[10px] transition-colors",
              isActive
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      {overflow.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 px-2 text-[10px] transition-colors outline-none",
              overflowActive
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400",
            )}
            aria-label="Plus d'options"
          >
            <MoreHorizontal className="size-5" aria-hidden />
            <span className="truncate">Plus</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="mr-2 mb-2 w-48"
          >
            {overflow.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href} />}
                  className={cn(isActive && "bg-zinc-100 dark:bg-zinc-800")}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
