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

type Investment = Tables<"investments">;
type InvestmentBalance = Views<"investment_balance">;

export type InvestmentWithCounterparty = Investment & {
  counterparty: { id: string; full_name: string } | null;
};

const INVESTMENTS_KEY = ["investments"] as const;
const INVESTMENT_BALANCE_KEY = ["investment_balance"] as const;

function client() {
  return createClient();
}

export function useInvestments() {
  return useQuery<InvestmentWithCounterparty[]>({
    queryKey: INVESTMENTS_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("investments")
        .select("*, counterparty:persons(id, full_name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvestmentWithCounterparty[];
    },
  });
}

export function useInvestment(id: string | null | undefined) {
  return useQuery<InvestmentWithCounterparty | null>({
    queryKey: [...INVESTMENTS_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await client()
        .from("investments")
        .select("*, counterparty:persons(id, full_name)")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as InvestmentWithCounterparty | null;
    },
  });
}

export function useInvestmentBalance() {
  return useQuery<Record<string, InvestmentBalance>>({
    queryKey: INVESTMENT_BALANCE_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("investment_balance")
        .select("*");
      if (error) throw error;
      const map: Record<string, InvestmentBalance> = {};
      for (const row of data ?? []) map[row.investment_id] = row;
      return map;
    },
  });
}

export function useInvestmentBalanceFor(id: string | null | undefined) {
  const all = useInvestmentBalance();
  const row = useMemo(() => (id ? all.data?.[id] : undefined), [all.data, id]);
  return { ...all, data: row };
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<TablesInsert<"investments">, "owner_id">,
    ) => {
      const { data, error } = await client()
        .from("investments")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVESTMENTS_KEY });
      qc.invalidateQueries({ queryKey: INVESTMENT_BALANCE_KEY });
    },
  });
}

export function useUpdateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: TablesUpdate<"investments">;
    }) => {
      const { data, error } = await client()
        .from("investments")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: INVESTMENTS_KEY });
      qc.invalidateQueries({ queryKey: [...INVESTMENTS_KEY, variables.id] });
      qc.invalidateQueries({ queryKey: INVESTMENT_BALANCE_KEY });
    },
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client()
        .from("investments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVESTMENTS_KEY });
      qc.invalidateQueries({ queryKey: INVESTMENT_BALANCE_KEY });
    },
  });
}
