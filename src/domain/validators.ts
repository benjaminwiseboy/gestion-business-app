import { z } from "zod";

// Shared primitives ----------------------------------------------------------

export const CurrencyCodeSchema = z.enum(["XOF", "USD"]);
export type CurrencyCodeInput = z.infer<typeof CurrencyCodeSchema>;

export const PersonRoleSchema = z.enum([
  "borrower",
  "lender",
  "client",
  "investor",
  "surveyor",
]);
export type PersonRole = z.infer<typeof PersonRoleSchema>;

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  borrower: "Emprunteur",
  lender: "Prêteur",
  client: "Client",
  investor: "Investisseur",
  surveyor: "Géomètre",
};

const emptyToNull = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

// Person ---------------------------------------------------------------------

export const PersonFormSchema = z.object({
  full_name: z.string().trim().min(1, "Le nom est requis").max(120),
  roles: z.array(PersonRoleSchema).min(1, "Au moins un rôle est requis"),
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

export const InterestTypeSchema = z.enum(["simple", "compound", "none"]);
export type InterestTypeInput = z.infer<typeof InterestTypeSchema>;

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
    interest_rate: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v !== "" ? v.replace(",", ".") : null))
      .refine(
        (v) => v === null || (/^\d+([.]\d+)?$/.test(v) && parseFloat(v) >= 0),
        "Taux invalide",
      ),
    interest_type: InterestTypeSchema.optional().nullable(),
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
