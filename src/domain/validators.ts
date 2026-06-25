import { z } from "zod";

// Shared primitives ----------------------------------------------------------

export const CurrencyCodeSchema = z.enum(["XAF", "USD"]);
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
  "admin_payment",
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
  admin_payment: "Paiement dossier",
  investment_in: "Investissement entrant",
  investment_out: "Distribution",
  fee: "Dépense",
  adjustment: "Ajustement",
};

/** Kinds that the user can create manually (others are derived from loans, land, etc.). */
export const ManualTransactionKindSchema = z.enum(["fee"]);
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

// Land (Terrain) -------------------------------------------------------------

export const LandProjectStatusSchema = z.enum(["active", "settled", "blocked"]);
export type LandProjectStatusInput = z.infer<typeof LandProjectStatusSchema>;

export const LAND_PROJECT_STATUS_LABELS: Record<
  LandProjectStatusInput,
  string
> = {
  active: "Actif",
  settled: "Soldé",
  blocked: "Bloqué",
};

export const LandAcquisitionStatusSchema = z.enum(["owned", "planned"]);
export type LandAcquisitionStatusInput = z.infer<
  typeof LandAcquisitionStatusSchema
>;

export const LAND_ACQUISITION_STATUS_LABELS: Record<
  LandAcquisitionStatusInput,
  string
> = {
  owned: "Possédé",
  planned: "À acquérir",
};

const optionalUuidStr = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? v : null))
  .refine(
    (v) =>
      v === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v),
    "Identifiant invalide",
  );

const optionalDateStr = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? v : null))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Date invalide",
  );

const optionalDecimalStr = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v !== "" ? v.replace(",", ".") : null))
  .refine(
    (v) => v === null || (/^\d+([.]\d+)?$/.test(v) && parseFloat(v) > 0),
    "Valeur invalide",
  );

export const LandFormSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120),
  location: emptyToNull,
  total_surface_m2: decimalString.refine(
    (v) => parseFloat(v) > 0,
    "Surface invalide",
  ),
  acquisition_status: LandAcquisitionStatusSchema,
  acquisition_amount: optionalDecimalStr,
  acquisition_currency: CurrencyCodeSchema,
  acquisition_date: optionalDateStr,
  acquisition_seller_person_id: optionalUuidStr,
  status: LandProjectStatusSchema,
  notes: emptyToNull,
});
export type LandFormInput = z.input<typeof LandFormSchema>;
export type LandFormValues = z.output<typeof LandFormSchema>;

// Land sale -----------------------------------------------------------------

export const LandSaleStatusSchema = z.enum(["active", "settled", "blocked"]);
export type LandSaleStatusInput = z.infer<typeof LandSaleStatusSchema>;

export const LAND_SALE_STATUS_LABELS: Record<LandSaleStatusInput, string> = {
  active: "En cours",
  settled: "Soldé",
  blocked: "Bloqué",
};

export const LandSaleFormSchema = z.object({
  buyer_person_id: optionalUuidStr,
  surface_m2: decimalString.refine(
    (v) => parseFloat(v) > 0,
    "Surface invalide",
  ),
  price_per_m2_amount: decimalString.refine(
    (v) => parseFloat(v) > 0,
    "Prix invalide",
  ),
  price_per_m2_currency: CurrencyCodeSchema,
  sale_date: z.string().date("Date de vente requise"),
  status: LandSaleStatusSchema,
  notes: emptyToNull,
});
export type LandSaleFormInput = z.input<typeof LandSaleFormSchema>;
export type LandSaleFormValues = z.output<typeof LandSaleFormSchema>;

export const LandPaymentFormSchema = z.object({
  amount: decimalString.refine(
    (v) => parseFloat(v) > 0,
    "Le montant doit être positif",
  ),
  currency: CurrencyCodeSchema,
  occurred_at: z.string().date("Date requise"),
  notes: emptyToNull,
});
export type LandPaymentFormInput = z.input<typeof LandPaymentFormSchema>;
export type LandPaymentFormValues = z.output<typeof LandPaymentFormSchema>;

// Admin file -----------------------------------------------------------------

export const AdminFileTypeSchema = z.enum([
  "technical",
  "title",
  "linking",
  "survey",
  "legal",
]);
export type AdminFileTypeInput = z.infer<typeof AdminFileTypeSchema>;

export const ADMIN_FILE_TYPE_LABELS: Record<AdminFileTypeInput, string> = {
  technical: "Dossier technique",
  title: "Titre foncier",
  linking: "Rattachement administratif",
  survey: "Bornage / géométrie",
  legal: "Procédure juridique",
};

export const AdminFileStatusSchema = z.enum([
  "processing",
  "awaiting_docs",
  "awaiting_payment",
  "done",
  "blocked",
]);
export type AdminFileStatusInput = z.infer<typeof AdminFileStatusSchema>;

export const ADMIN_FILE_STATUS_LABELS: Record<AdminFileStatusInput, string> = {
  processing: "En cours",
  awaiting_docs: "Attente documents",
  awaiting_payment: "Attente paiement",
  done: "Finalisé",
  blocked: "Bloqué",
};

const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? v : null))
  .refine(
    (v) =>
      v === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v),
    "Identifiant invalide",
  );

const optionalDecimal = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v !== "" ? v.replace(",", ".") : null))
  .refine(
    (v) => v === null || (/^\d+([.]\d+)?$/.test(v) && parseFloat(v) > 0),
    "Valeur invalide",
  );

export const AdminFileFormSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120),
  type: AdminFileTypeSchema,
  land_id: optionalUuid,
  beneficiary_person_id: optionalUuid,
  surveyor_person_id: optionalUuid,
  surface_m2: optionalDecimal,
  total_cost_amount: optionalDecimal,
  total_cost_currency: CurrencyCodeSchema,
  status: AdminFileStatusSchema,
  notes: emptyToNull,
});
export type AdminFileFormInput = z.input<typeof AdminFileFormSchema>;
export type AdminFileFormValues = z.output<typeof AdminFileFormSchema>;

export const AdminPaymentFormSchema = z.object({
  amount: decimalString.refine(
    (v) => parseFloat(v) > 0,
    "Le montant doit être positif",
  ),
  currency: CurrencyCodeSchema,
  occurred_at: z.string().date("Date requise"),
  notes: emptyToNull,
});
export type AdminPaymentFormInput = z.input<typeof AdminPaymentFormSchema>;
export type AdminPaymentFormValues = z.output<typeof AdminPaymentFormSchema>;

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

// Investment ----------------------------------------------------------------

export const InvestmentTypeSchema = z.enum([
  "capital",
  "tontine",
  "savings",
  "other",
]);
export type InvestmentTypeInput = z.infer<typeof InvestmentTypeSchema>;

export const INVESTMENT_TYPE_LABELS: Record<InvestmentTypeInput, string> = {
  capital: "Capital / Participation",
  tontine: "Tontine",
  savings: "Épargne / DAT",
  other: "Autre",
};

export const INVESTMENT_TYPE_DESCRIPTIONS: Record<InvestmentTypeInput, string> =
  {
    capital: "Mise dans un commerce ou projet contre une part du profit",
    tontine: "Cotisation périodique dans un groupe rotatif",
    savings: "Épargne, dépôt à terme, compte rémunéré",
    other: "Autre type d'investissement (foncier spéculatif, crypto, etc.)",
  };

export const InvestmentStatusSchema = z.enum(["active", "closed", "lost"]);
export type InvestmentStatusInput = z.infer<typeof InvestmentStatusSchema>;

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatusInput, string> = {
  active: "Actif",
  closed: "Clôturé",
  lost: "Perdu",
};

export const InvestmentFormSchema = z
  .object({
    title: z.string().trim().min(1, "Titre requis").max(120),
    type: InvestmentTypeSchema,
    counterparty_person_id: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? v : null))
      .refine(
        (v) =>
          v === null ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            v,
          ),
        "Contrepartie invalide",
      ),
    principal_amount: decimalString.refine(
      (v) => parseFloat(v) > 0,
      "Le montant doit être positif",
    ),
    principal_currency: CurrencyCodeSchema,
    expected_return_pct: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v !== "" ? v.replace(",", ".") : null))
      .refine(
        (v) => v === null || (/^\d+([.]\d+)?$/.test(v) && parseFloat(v) >= 0),
        "Rendement invalide",
      ),
    start_date: z.string().date("Date de début requise"),
    end_date: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? v : null))
      .refine(
        (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
        "Date de fin invalide",
      ),
    status: InvestmentStatusSchema,
    notes: emptyToNull,
  })
  .refine(
    (data) =>
      data.end_date === null ||
      new Date(data.end_date) >= new Date(data.start_date),
    {
      message: "La date de fin doit être postérieure à la date de début",
      path: ["end_date"],
    },
  );
export type InvestmentFormInput = z.input<typeof InvestmentFormSchema>;
export type InvestmentFormValues = z.output<typeof InvestmentFormSchema>;

export const InvestmentMovementDirectionSchema = z.enum(["in", "out"]);
export type InvestmentMovementDirectionInput = z.infer<
  typeof InvestmentMovementDirectionSchema
>;

export const INVESTMENT_MOVEMENT_DIRECTION_LABELS: Record<
  InvestmentMovementDirectionInput,
  string
> = {
  in: "Apport",
  out: "Retour",
};

export const InvestmentMovementFormSchema = z.object({
  direction: InvestmentMovementDirectionSchema,
  amount: decimalString.refine(
    (v) => parseFloat(v) > 0,
    "Le montant doit être positif",
  ),
  currency: CurrencyCodeSchema,
  occurred_at: z.string().date("Date requise"),
  notes: emptyToNull,
});
export type InvestmentMovementFormInput = z.input<
  typeof InvestmentMovementFormSchema
>;
export type InvestmentMovementFormValues = z.output<
  typeof InvestmentMovementFormSchema
>;
