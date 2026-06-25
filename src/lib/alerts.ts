import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  FileText,
  MapPin,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { InvestmentWithCounterparty } from "@/hooks/use-investments";
import type { LoanWithPerson } from "@/hooks/use-loans";
import type { AdminFileWithPersons } from "@/hooks/use-admin-files";
import type { LandSaleWithBuyer } from "@/hooks/use-land-sales";
import type { TransactionWithPerson } from "@/hooks/use-transactions";
import type { Views } from "@/lib/supabase/types";

export type AlertSeverity = "overdue" | "upcoming" | "attention";
export type AlertDomain =
  | "loan_lent"
  | "loan_borrowed"
  | "investment"
  | "tontine"
  | "admin_file"
  | "land";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  domain: AlertDomain;
  title: string;
  description: string;
  href: string;
  /** ISO date used for sorting within the same severity. */
  sortDate: string | null;
}

export const DOMAIN_CONFIG: Record<
  AlertDomain,
  { label: string; icon: LucideIcon }
> = {
  loan_lent: { label: "Prêt", icon: Wallet },
  loan_borrowed: { label: "Dette", icon: Wallet },
  investment: { label: "Investissement", icon: TrendingUp },
  tontine: { label: "Tontine", icon: PiggyBank },
  admin_file: { label: "Dossier", icon: FileText },
  land: { label: "Foncier", icon: MapPin },
};

export const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; icon: LucideIcon; tone: "danger" | "warning" | "info" }
> = {
  overdue: { label: "Retards", icon: AlertTriangle, tone: "danger" },
  upcoming: {
    label: "Échéances dans 7 jours",
    icon: CalendarClock,
    tone: "warning",
  },
  attention: { label: "À surveiller", icon: Clock, tone: "info" },
};

const HORIZON_DAYS = 7;
const STALE_TONTINE_DAYS = 30;
const STUCK_ADMIN_DAYS = 14;
const STALE_LAND_DAYS = 30;

export interface AlertsInput {
  loans: LoanWithPerson[];
  loanRemaining: Record<string, Views<"loan_remaining">>;
  investments: InvestmentWithCounterparty[];
  adminFiles: AdminFileWithPersons[];
  landSales: LandSaleWithBuyer[];
  landSaleRemaining: Record<string, Views<"land_sale_remaining">>;
  transactions: TransactionWithPerson[];
}

export function computeAlerts(input: AlertsInput): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  collectLoanAlerts(input, alerts, today);
  collectInvestmentAlerts(input, alerts, today);
  collectTontineAlerts(input, alerts, today);
  collectAdminFileAlerts(input, alerts, today);
  collectLandAlerts(input, alerts, today);

  const order: Record<AlertSeverity, number> = {
    overdue: 0,
    upcoming: 1,
    attention: 2,
  };
  return alerts.sort((a, b) => {
    if (order[a.severity] !== order[b.severity])
      return order[a.severity] - order[b.severity];
    if (a.sortDate && b.sortDate)
      return a.sortDate < b.sortDate ? -1 : a.sortDate > b.sortDate ? 1 : 0;
    if (a.sortDate) return -1;
    if (b.sortDate) return 1;
    return 0;
  });
}

function collectLoanAlerts(
  input: AlertsInput,
  out: Alert[],
  today: Date,
): void {
  for (const loan of input.loans) {
    if (loan.status === "repaid") continue;
    if (!loan.due_date) continue;
    const row = input.loanRemaining[loan.id];
    if (row && row.remaining_amount <= 0) continue;

    const due = parseISO(loan.due_date);
    const days = differenceInCalendarDays(due, today);
    const person = loan.person?.full_name ?? "—";
    const domain: AlertDomain =
      loan.direction === "lent" ? "loan_lent" : "loan_borrowed";
    const title =
      loan.direction === "lent"
        ? `À recouvrer de ${person}`
        : `À rembourser à ${person}`;

    if (days < 0) {
      out.push({
        id: `loan-${loan.id}`,
        severity: "overdue",
        domain,
        title,
        description: `${Math.abs(days)} j de retard`,
        href: `/loans/${loan.id}`,
        sortDate: loan.due_date,
      });
    } else if (days <= HORIZON_DAYS) {
      out.push({
        id: `loan-${loan.id}`,
        severity: "upcoming",
        domain,
        title,
        description: days === 0 ? "Aujourd'hui" : `dans ${days} j`,
        href: `/loans/${loan.id}`,
        sortDate: loan.due_date,
      });
    }
  }
}

function collectInvestmentAlerts(
  input: AlertsInput,
  out: Alert[],
  today: Date,
): void {
  for (const inv of input.investments) {
    if (inv.status !== "active") continue;
    if (!inv.end_date) continue;
    const end = parseISO(inv.end_date);
    const days = differenceInCalendarDays(end, today);

    if (days < 0) {
      out.push({
        id: `inv-end-${inv.id}`,
        severity: "overdue",
        domain: "investment",
        title: inv.title,
        description: `Échéance dépassée (${Math.abs(days)} j)`,
        href: `/investments/${inv.id}`,
        sortDate: inv.end_date,
      });
    } else if (days <= HORIZON_DAYS) {
      out.push({
        id: `inv-end-${inv.id}`,
        severity: "upcoming",
        domain: "investment",
        title: inv.title,
        description: days === 0 ? "Échue aujourd'hui" : `Échue dans ${days} j`,
        href: `/investments/${inv.id}`,
        sortDate: inv.end_date,
      });
    }
  }
}

function collectTontineAlerts(
  input: AlertsInput,
  out: Alert[],
  today: Date,
): void {
  for (const inv of input.investments) {
    if (inv.status !== "active") continue;
    if (inv.type !== "tontine") continue;

    const movements = input.transactions
      .filter(
        (t) =>
          t.linked_entity_type === "investment" &&
          t.linked_entity_id === inv.id,
      )
      .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));

    const referenceDate = movements[0]?.occurred_at ?? inv.created_at;
    const last = parseISO(referenceDate);
    const days = differenceInCalendarDays(today, last);

    if (days < STALE_TONTINE_DAYS) continue;

    out.push({
      id: `inv-tontine-${inv.id}`,
      severity: "attention",
      domain: "tontine",
      title: inv.title,
      description:
        movements.length === 0
          ? "Aucune cotisation enregistrée"
          : `Aucun mouvement depuis ${days} j`,
      href: `/investments/${inv.id}`,
      sortDate: referenceDate.slice(0, 10),
    });
  }
}

function collectAdminFileAlerts(
  input: AlertsInput,
  out: Alert[],
  today: Date,
): void {
  for (const file of input.adminFiles) {
    if (file.status === "blocked") {
      out.push({
        id: `admin-${file.id}`,
        severity: "overdue",
        domain: "admin_file",
        title: file.title,
        description: "Dossier bloqué",
        href: `/admin-files/${file.id}`,
        sortDate: file.updated_at.slice(0, 10),
      });
      continue;
    }
    if (
      file.status !== "awaiting_docs" &&
      file.status !== "awaiting_payment"
    )
      continue;
    const updated = parseISO(file.updated_at);
    const days = differenceInCalendarDays(today, updated);
    if (days < STUCK_ADMIN_DAYS) continue;
    out.push({
      id: `admin-${file.id}`,
      severity: "attention",
      domain: "admin_file",
      title: file.title,
      description:
        file.status === "awaiting_docs"
          ? `En attente de documents depuis ${days} j`
          : `En attente de paiement depuis ${days} j`,
      href: `/admin-files/${file.id}`,
      sortDate: file.updated_at.slice(0, 10),
    });
  }
}

function collectLandAlerts(
  input: AlertsInput,
  out: Alert[],
  today: Date,
): void {
  for (const sale of input.landSales) {
    if (sale.status !== "active") continue;
    const row = input.landSaleRemaining[sale.id];
    if (!row || row.remaining_amount <= 0) continue;

    const payments = input.transactions
      .filter(
        (t) =>
          t.linked_entity_type === "land_sale" &&
          t.linked_entity_id === sale.id &&
          t.kind === "land_payment",
      )
      .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));

    if (payments.length === 0) continue;
    const last = parseISO(payments[0].occurred_at);
    const days = differenceInCalendarDays(today, last);
    if (days < STALE_LAND_DAYS) continue;

    out.push({
      id: `land-sale-${sale.id}`,
      severity: "attention",
      domain: "land",
      title: sale.buyer?.full_name ?? "Vente sans acheteur",
      description: `Aucun paiement depuis ${days} j`,
      href: `/land/${sale.land_id}`,
      sortDate: payments[0].occurred_at.slice(0, 10),
    });
  }
}
