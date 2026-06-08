import {
  ArrowLeftRight,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  inBottomNav: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    inBottomNav: true,
  },
  {
    href: "/loans",
    label: "Prêts & dettes",
    icon: Wallet,
    inBottomNav: true,
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    inBottomNav: true,
  },
  {
    href: "/persons",
    label: "Personnes",
    icon: Users,
    inBottomNav: true,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: Settings,
    inBottomNav: false,
  },
];
