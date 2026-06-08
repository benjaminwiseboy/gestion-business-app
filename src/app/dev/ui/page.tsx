"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MoneyDisplay } from "@/components/money-display";
import { MoneyInput } from "@/components/forms/money-input";
import { CurrencyBadge } from "@/components/currency-badge";
import { StatusBadge, type Status } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { money, type Money } from "@/lib/money";
import { Inbox } from "lucide-react";

const STATUSES: Status[] = [
  "active",
  "repaid",
  "partial",
  "overdue",
  "settled",
  "blocked",
  "processing",
  "awaiting_docs",
  "awaiting_payment",
  "done",
];

export default function DevUiPage() {
  const [amount, setAmount] = useState<Money | null>(money(125000, "XOF"));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Design system</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Aperçu des composants pour le développement. Retiré en production.
        </p>
      </header>

      <Section
        title="MoneyDisplay"
        description="Affichage de montants avec équivalent FCFA si devise étrangère"
      >
        <div className="flex flex-wrap items-end gap-6">
          <MoneyDisplay money={money(1_500_000, "XOF")} size="xl" />
          <MoneyDisplay money={money(2_500, "USD")} size="xl" />
          <MoneyDisplay money={money(750, "USD")} />
          <MoneyDisplay money={money(0, "XOF")} size="sm" />
        </div>
      </Section>

      <Section
        title="MoneyInput"
        description="Saisie d'un montant avec sélection de devise"
      >
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor="amount">Montant</Label>
          <MoneyInput value={amount} onChange={setAmount} />
          <p className="text-xs text-zinc-500">
            Valeur :{" "}
            {amount
              ? `${amount.amount.toString()} ${amount.currency}`
              : "(vide)"}
          </p>
        </div>
      </Section>

      <Section title="CurrencyBadge">
        <div className="flex gap-2">
          <CurrencyBadge currency="XOF" />
          <CurrencyBadge currency="USD" />
        </div>
      </Section>

      <Section title="StatusBadge" description="États des prêts et dossiers">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Badge (shadcn)">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Input">
        <div className="grid max-w-md gap-3">
          <div>
            <Label htmlFor="i1">Email</Label>
            <Input id="i1" type="email" placeholder="vous@exemple.com" />
          </div>
          <div>
            <Label htmlFor="i2">Disabled</Label>
            <Input id="i2" disabled value="Non modifiable" />
          </div>
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={Inbox}
          title="Aucun élément"
          description="Commencez par créer votre premier enregistrement."
          action={{ label: "Créer", href: "/dashboard" }}
        />
      </Section>

      <Section title="ErrorState">
        <ErrorState onRetry={() => alert("retry")} />
      </Section>

      <Section title="Card (shadcn)">
        <Card>
          <CardHeader>
            <CardTitle>Carte exemple</CardTitle>
            <CardDescription>
              Un titre, une description, du contenu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Contenu de la carte.</p>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
      <Separator />
    </section>
  );
}
