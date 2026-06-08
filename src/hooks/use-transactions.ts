"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { deriveStatus } from "@/domain/loans";
import type {
  LinkedEntityType,
  Tables,
  TablesInsert,
} from "@/lib/supabase/types";

type Transaction = Tables<"transactions">;
type Loan = Tables<"loans">;

const TRANSACTIONS_KEY = ["transactions"] as const;
const LOANS_KEY = ["loans"] as const;
const LOAN_REMAINING_KEY = ["loan_remaining"] as const;

function client() {
  return createClient();
}

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: TRANSACTIONS_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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
    },
  });
}
