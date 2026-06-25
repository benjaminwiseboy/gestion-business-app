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

type LandSale = Tables<"land_sales">;
type SaleRemaining = Views<"land_sale_remaining">;

export type LandSaleWithBuyer = LandSale & {
  buyer: { id: string; full_name: string } | null;
};

const LAND_SALES_KEY = ["land_sales"] as const;
const SALE_REMAINING_KEY = ["land_sale_remaining"] as const;

function client() {
  return createClient();
}

export function useLandSales(landId: string | null | undefined) {
  return useQuery<LandSaleWithBuyer[]>({
    queryKey: [...LAND_SALES_KEY, landId],
    enabled: Boolean(landId),
    queryFn: async () => {
      if (!landId) return [];
      const { data, error } = await client()
        .from("land_sales")
        .select("*, buyer:persons!land_sales_buyer_person_id_fkey(id, full_name)")
        .eq("land_id", landId)
        .is("deleted_at", null)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LandSaleWithBuyer[];
    },
  });
}

export function useAllLandSales() {
  return useQuery<LandSaleWithBuyer[]>({
    queryKey: LAND_SALES_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("land_sales")
        .select("*, buyer:persons!land_sales_buyer_person_id_fkey(id, full_name)")
        .is("deleted_at", null)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LandSaleWithBuyer[];
    },
  });
}

export function useLandSaleRemaining() {
  return useQuery<Record<string, SaleRemaining>>({
    queryKey: SALE_REMAINING_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("land_sale_remaining")
        .select("*");
      if (error) throw error;
      const map: Record<string, SaleRemaining> = {};
      for (const row of data ?? []) map[row.sale_id] = row;
      return map;
    },
  });
}

export function useLandSaleRemainingFor(id: string | null | undefined) {
  const all = useLandSaleRemaining();
  const row = useMemo(() => (id ? all.data?.[id] : undefined), [all.data, id]);
  return { ...all, data: row };
}

export function useCreateLandSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<TablesInsert<"land_sales">, "owner_id">,
    ) => {
      const { data, error } = await client()
        .from("land_sales")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: LAND_SALES_KEY });
      qc.invalidateQueries({ queryKey: [...LAND_SALES_KEY, data.land_id] });
      qc.invalidateQueries({ queryKey: SALE_REMAINING_KEY });
      qc.invalidateQueries({ queryKey: ["land_inventory"] });
    },
  });
}

export function useUpdateLandSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: TablesUpdate<"land_sales">;
    }) => {
      const { data, error } = await client()
        .from("land_sales")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: LAND_SALES_KEY });
      qc.invalidateQueries({ queryKey: [...LAND_SALES_KEY, data.land_id] });
      qc.invalidateQueries({ queryKey: SALE_REMAINING_KEY });
      qc.invalidateQueries({ queryKey: ["land_inventory"] });
    },
  });
}

export function useDeleteLandSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sale: { id: string; land_id: string }) => {
      const { error } = await client()
        .from("land_sales")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", sale.id);
      if (error) throw error;
      return sale;
    },
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: LAND_SALES_KEY });
      qc.invalidateQueries({ queryKey: [...LAND_SALES_KEY, sale.land_id] });
      qc.invalidateQueries({ queryKey: SALE_REMAINING_KEY });
      qc.invalidateQueries({ queryKey: ["land_inventory"] });
    },
  });
}
