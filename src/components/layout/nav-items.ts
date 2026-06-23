import {
  ArrowLeftRight,
  FileText,
  LayoutDashboard,
  MapPin,
  Settings,
  TrendingUp,
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
    href: "/land",
    label: "Foncier",
    icon: MapPin,
    inBottomNav: true,
  },
  {
    href: "/investments",
    label: "Investissements",
    icon: TrendingUp,
    inBottomNav: true,
  },
  {
    href: "/admin-files",
    label: "Dossiers",
    icon: FileText,
    inBottomNav: false,
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    inBottomNav: false,
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
