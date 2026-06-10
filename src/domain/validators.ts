import { z } from "zod";

// Shared primitives ----------------------------------------------------------

export const CurrencyCodeSchema = z.enum(["XOF", "USD"]);
export type CurrencyCodeInput = z.infer<typeof CurrencyCodeSchema>;

export const PersonKindSchema = z.enum(["individual", "entity"]);
export type PersonKindInput = z.infer<typeof PersonKindSchema>;

export const PERSON_KIND_LABELS: Record<PersonKindInput, string> = {
  individual: "Personne physique",
  entity: "Personne morale",
};

export const PERSON_KIND_DESCRIPTIONS: Record<PersonKindInput, string> = {
  individual: "Un particulier (ami, famille, partenaire, etc.)",
  entity: "Une organisation (banque, tontine, association, société, etc.)",
};

const emptyToNull = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

// Person ---------------------------------------------------------------------

export const PersonFormSchema = z.object({
  full_name: z.string().trim().min(1, "Le nom est requis").max(120),
  kind: PersonKindSchema,
  phone: emptyToNull,
  email: emptyToNull.refine(
    (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Email invalide",
  ),
  address: emptyToNull,
  notes: emptyToNull,
});
export type PersonFormInput = z.input<typeof PersonFormSchema>;
export type PersonFormValues = z.output<typeof PersonFormSchema>;

// Loan -----------------------------------------------------------------------

export const LoanDirectionSchema = z.enum(["lent", "borrowed"]);
export type LoanDirectionInput = z.infer<typeof LoanDirectionSchema>;

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d+)?$/, "Montant invalide")
  .transform((v) => v.replace(",", "."));

export const LoanFormSchema = z
  .object({
    person_id: z.string().uuid("Personne requise"),
    direction: LoanDirectionSchema,
    principal_amount: decimalString.refine(
      (v) => parseFloat(v) > 0,
      "Le montant doit être positif",
    ),
    principal_currency: CurrencyCodeSchema,
    has_interest: z.boolean(),
    interest_rate: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v !== "" ? v.replace(",", ".") : null))
      .refine(
        (v) => v === null || (/^\d+([.]\d+)?$/.test(v) && parseFloat(v) >= 0),
        "Taux invalide",
      ),
    issue_date: z.string().date("Date d'octroi requise"),
    due_date: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? v : null))
      .refine(
        (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
        "Date d'échéance invalide",
      ),
    notes: emptyToNull,
  })
  .refine(
    (data) =>
      data.due_date === null ||
      new Date(data.due_date) >= new Date(data.issue_date),
    {
      message: "L'échéance doit être postérieure à la date d'octroi",
      path: ["due_date"],
    },
  )
  .refine(
    (data) =>
      !data.has_interest ||
      (data.interest_rate !== null && parseFloat(data.interest_rate) > 0),
    {
      message: "Saisissez un taux positif",
      path: ["interest_rate"],
    },
  );
export type LoanFormInput = z.input<typeof LoanFormSchema>;
export type LoanFormValues = z.output<typeof LoanFormSchema>;

// Transaction ----------------------------------------------------------------

export const TransactionKindSchema = z.enum([
  "loan_disbursement",
  "repayment",
  "land_payment",
  "investment_in",
  "investment_out",
  "fee",
  "adjustment",
]);
export type TransactionKindInput = z.infer<typeof TransactionKindSchema>;

export const TRANSACTION_KIND_LABELS: Record<TransactionKindInput, string> = {
  loan_disbursement: "Décaissement de prêt",
  repayment: "Remboursement",
  land_payment: "Paiement foncier",
  investment_in: "Investissement entrant",
  investment_out: "Distribution",
  fee: "Frais",
  adjustment: "Ajustement",
};

/** Kinds that the user can create manually (others are derived from loans, land, etc.). */
export const ManualTransactionKindSchema = z.enum(["fee", "adjustment"]);
export type ManualTransactionKind = z.infer<typeof ManualTransactionKindSchema>;

export const RepaymentFormSchema = z.object({
  amount: decimalString.refine(
    (v) => parseFloat(v) > 0,
    "Le montant doit être positif",
  ),
  currency: CurrencyCodeSchema,
  occurred_at: z.string().date("Date requise"),
  notes: emptyToNull,
});
export type RepaymentFormInput = z.input<typeof RepaymentFormSchema>;
export type RepaymentFormValues = z.output<typeof RepaymentFormSchema>;

export const ManualTransactionFormSchema = z.object({
  kind: ManualTransactionKindSchema,
  amount: decimalString.refine(
    (v) => parseFloat(v) > 0,
    "Le montant doit être positif",
  ),
  currency: CurrencyCodeSchema,
  occurred_at: z.string().date("Date requise"),
  person_id: z.string().uuid("Personne requise"),
  notes: emptyToNull,
});
export type ManualTransactionFormInput = z.input<
  typeof ManualTransactionFormSchema
>;
export type ManualTransactionFormValues = z.output<
  typeof ManualTransactionFormSchema
>;
