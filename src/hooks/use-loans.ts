"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Views,
} from "@/lib/supabase/types";

type Loan = Tables<"loans">;
type LoanRemaining = Views<"loan_remaining">;

export type LoanWithPerson = Loan & {
  person: { id: string; full_name: string } | null;
};

const LOANS_KEY = ["loans"] as const;
const LOAN_REMAINING_KEY = ["loan_remaining"] as const;

function client() {
  return createClient();
}

export function useLoans() {
  return useQuery<LoanWithPerson[]>({
    queryKey: LOANS_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("loans")
        .select("*, person:persons(id, full_name)")
        .is("deleted_at", null)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LoanWithPerson[];
    },
  });
}

export function useLoan(id: string | null | undefined) {
  return useQuery<LoanWithPerson | null>({
    queryKey: [...LOANS_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await client()
        .from("loans")
        .select("*, person:persons(id, full_name)")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LoanWithPerson | null;
    },
  });
}

/** Fetches loan_remaining view rows, keyed by loan_id. */
export function useLoanRemaining() {
  return useQuery<Record<string, LoanRemaining>>({
    queryKey: LOAN_REMAINING_KEY,
    queryFn: async () => {
      const { data, error } = await client().from("loan_remaining").select("*");
      if (error) throw error;
      const map: Record<string, LoanRemaining> = {};
      for (const row of data ?? []) map[row.loan_id] = row;
      return map;
    },
  });
}

/** Single-loan remaining lookup that piggybacks on the cached list. */
export function useLoanRemainingFor(loanId: string | null | undefined) {
  const remaining = useLoanRemaining();
  const row = useMemo(
    () => (loanId ? remaining.data?.[loanId] : undefined),
    [remaining.data, loanId],
  );
  return { ...remaining, data: row };
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"loans">, "owner_id">) => {
      const { data, error } = await client()
        .from("loans")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOANS_KEY });
      qc.invalidateQueries({ queryKey: LOAN_REMAINING_KEY });
    },
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: TablesUpdate<"loans">;
    }) => {
      const { data, error } = await client()
        .from("loans")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: LOANS_KEY });
      qc.invalidateQueries({ queryKey: [...LOANS_KEY, variables.id] });
      qc.invalidateQueries({ queryKey: LOAN_REMAINING_KEY });
    },
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client()
        .from("loans")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOANS_KEY });
      qc.invalidateQueries({ queryKey: LOAN_REMAINING_KEY });
    },
  });
}
