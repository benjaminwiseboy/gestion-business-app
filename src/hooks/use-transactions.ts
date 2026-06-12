"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { deriveStatus } from "@/domain/loans";
import type {
  LinkedEntityType,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase/types";

type Transaction = Tables<"transactions">;
type Loan = Tables<"loans">;

export type TransactionWithPerson = Transaction & {
  person: { id: string; full_name: string } | null;
};

const TRANSACTIONS_KEY = ["transactions"] as const;
const LOANS_KEY = ["loans"] as const;
const LOAN_REMAINING_KEY = ["loan_remaining"] as const;

function client() {
  return createClient();
}

export function useTransactions() {
  return useQuery<TransactionWithPerson[]>({
    queryKey: TRANSACTIONS_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("transactions")
        .select("*, person:persons(id, full_name)")
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TransactionWithPerson[];
    },
  });
}

export function useTransaction(id: string | null | undefined) {
  return useQuery<TransactionWithPerson | null>({
    queryKey: [...TRANSACTIONS_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await client()
        .from("transactions")
        .select("*, person:persons(id, full_name)")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TransactionWithPerson | null;
    },
  });
}

/** Create a standalone transaction (fee / adjustment / manual entry). */
export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<TablesInsert<"transactions">, "owner_id">,
    ) => {
      const { data, error } = await client()
        .from("transactions")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: LOAN_REMAINING_KEY });
      qc.invalidateQueries({ queryKey: LOANS_KEY });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: TablesUpdate<"transactions">;
    }) => {
      const { data, error } = await client()
        .from("transactions")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: [...TRANSACTIONS_KEY, variables.id] });
      qc.invalidateQueries({ queryKey: LOAN_REMAINING_KEY });
      qc.invalidateQueries({ queryKey: LOANS_KEY });
    },
  });
}

/** Sub-select of cached transactions by entity link. */
export function useTransactionsFor(
  type: LinkedEntityType | null | undefined,
  id: string | null | undefined,
) {
  const query = useTransactions();
  const filtered = useMemo(() => {
    if (!type || !id || !query.data) return [];
    return query.data.filter(
      (t) => t.linked_entity_type === type && t.linked_entity_id === id,
    );
  }, [query.data, type, id]);
  return { ...query, data: filtered };
}

/**
 * Insert a repayment transaction, then recompute the parent loan's `status`
 * column from the fresh data so list badges stay accurate without a server
 * trigger.
 */
export function useCreateRepayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      loan: Pick<
        Loan,
        | "id"
        | "person_id"
        | "due_date"
        | "principal_amount"
        | "principal_currency"
      >;
      amount: number;
      currency: string;
      occurred_at: string;
      notes: string | null;
      exchange_rate_snapshot?: number;
    }) => {
      const supabase = client();
      const insert: Omit<TablesInsert<"transactions">, "owner_id"> = {
        kind: "repayment",
        amount: input.amount,
        currency: input.currency,
        exchange_rate_snapshot: input.exchange_rate_snapshot ?? 1,
        occurred_at: input.occurred_at,
        person_id: input.loan.person_id,
        linked_entity_type: "loan",
        linked_entity_id: input.loan.id,
        notes: input.notes,
      };
      const { data: inserted, error: insertError } = await supabase
        .from("transactions")
        .insert(insert)
        .select()
        .single();
      if (insertError) throw insertError;

      const { data: allTx } = await supabase
        .from("transactions")
        .select("*")
        .eq("linked_entity_type", "loan")
        .eq("linked_entity_id", input.loan.id)
        .is("deleted_at", null);

      const nextStatus = deriveStatus(
        {
          id: input.loan.id,
          principal_amount: input.loan.principal_amount,
          principal_currency: input.loan.principal_currency,
          due_date: input.loan.due_date,
        },
        allTx ?? [],
      );

      await supabase
        .from("loans")
        .update({ status: nextStatus })
        .eq("id", input.loan.id);

      return inserted;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: LOAN_REMAINING_KEY });
      qc.invalidateQueries({ queryKey: LOANS_KEY });
      qc.invalidateQueries({
        queryKey: [...LOANS_KEY, variables.loan.id],
      });
    },
  });
}

/**
 * Insert a land_payment transaction linked to a project. Recomputes the
 * project's status to "settled" when remaining_amount hits 0.
 */
export function useCreateLandPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project: {
        id: string;
        client_person_id: string | null;
        total_amount: number;
        price_per_m2_currency: string;
      };
      amount: number;
      currency: string;
      occurred_at: string;
      notes: string | null;
      exchange_rate_snapshot?: number;
    }) => {
      const supabase = client();
      const insert: Omit<TablesInsert<"transactions">, "owner_id"> = {
        kind: "land_payment",
        amount: input.amount,
        currency: input.currency,
        exchange_rate_snapshot: input.exchange_rate_snapshot ?? 1,
        occurred_at: input.occurred_at,
        person_id: input.project.client_person_id,
        linked_entity_type: "land_project",
        linked_entity_id: input.project.id,
        notes: input.notes,
      };
      const { data: inserted, error: insertError } = await supabase
        .from("transactions")
        .insert(insert)
        .select()
        .single();
      if (insertError) throw insertError;

      // Recompute paid total in the project's own currency and flip
      // status to "settled" if the remaining balance is now <= 0.
      const { data: allTx } = await supabase
        .from("transactions")
        .select("amount,currency")
        .eq("linked_entity_type", "land_project")
        .eq("linked_entity_id", input.project.id)
        .eq("kind", "land_payment")
        .is("deleted_at", null);
      const paid = (allTx ?? [])
        .filter((t) => t.currency === input.project.price_per_m2_currency)
        .reduce((acc, t) => acc + Number(t.amount), 0);
      const nextStatus =
        paid >= Number(input.project.total_amount) ? "settled" : "active";
      await supabase
        .from("land_projects")
        .update({ status: nextStatus })
        .eq("id", input.project.id);

      return inserted;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: ["land_project_remaining"] });
      qc.invalidateQueries({ queryKey: ["land_projects"] });
      qc.invalidateQueries({
        queryKey: ["land_projects", variables.project.id],
      });
    },
  });
}

/**
 * Insert an admin_payment transaction linked to an admin file. Flips the
 * file's status to "done" when paid >= total_cost_amount.
 */
export function useCreateAdminPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: {
        id: string;
        beneficiary_person_id: string | null;
        surveyor_person_id: string | null;
        total_cost_amount: number | null;
        total_cost_currency: string | null;
      };
      amount: number;
      currency: string;
      occurred_at: string;
      notes: string | null;
      exchange_rate_snapshot?: number;
    }) => {
      const supabase = client();
      const insert: Omit<TablesInsert<"transactions">, "owner_id"> = {
        kind: "admin_payment",
        amount: input.amount,
        currency: input.currency,
        exchange_rate_snapshot: input.exchange_rate_snapshot ?? 1,
        occurred_at: input.occurred_at,
        person_id:
          input.file.surveyor_person_id ?? input.file.beneficiary_person_id,
        linked_entity_type: "admin_file",
        linked_entity_id: input.file.id,
        notes: input.notes,
      };
      const { data: inserted, error: insertError } = await supabase
        .from("transactions")
        .insert(insert)
        .select()
        .single();
      if (insertError) throw insertError;

      if (
        input.file.total_cost_amount !== null &&
        input.file.total_cost_currency !== null
      ) {
        const { data: allTx } = await supabase
          .from("transactions")
          .select("amount,currency")
          .eq("linked_entity_type", "admin_file")
          .eq("linked_entity_id", input.file.id)
          .eq("kind", "admin_payment")
          .is("deleted_at", null);
        const paid = (allTx ?? [])
          .filter((t) => t.currency === input.file.total_cost_currency)
          .reduce((acc, t) => acc + Number(t.amount), 0);
        if (paid >= Number(input.file.total_cost_amount)) {
          await supabase
            .from("admin_files")
            .update({ status: "done" })
            .eq("id", input.file.id);
        }
      }

      return inserted;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: ["admin_file_remaining"] });
      qc.invalidateQueries({ queryKey: ["admin_files"] });
      qc.invalidateQueries({
        queryKey: ["admin_files", variables.file.id],
      });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client()
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: LOAN_REMAINING_KEY });
      qc.invalidateQueries({ queryKey: LOANS_KEY });
      qc.invalidateQueries({ queryKey: ["land_project_remaining"] });
      qc.invalidateQueries({ queryKey: ["land_projects"] });
      qc.invalidateQueries({ queryKey: ["admin_file_remaining"] });
      qc.invalidateQueries({ queryKey: ["admin_files"] });
    },
  });
}
