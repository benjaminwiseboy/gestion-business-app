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

type Land = Tables<"land_projects">;
type LandInventory = Views<"land_inventory">;

export type LandWithSeller = Land & {
  seller: { id: string; full_name: string } | null;
};

const LANDS_KEY = ["lands"] as const;
const LAND_INVENTORY_KEY = ["land_inventory"] as const;

function client() {
  return createClient();
}

export function useLands() {
  return useQuery<LandWithSeller[]>({
    queryKey: LANDS_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("land_projects")
        .select(
          "*, seller:persons!land_projects_acquisition_seller_person_id_fkey(id, full_name)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LandWithSeller[];
    },
  });
}

export function useLand(id: string | null | undefined) {
  return useQuery<LandWithSeller | null>({
    queryKey: [...LANDS_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await client()
        .from("land_projects")
        .select(
          "*, seller:persons!land_projects_acquisition_seller_person_id_fkey(id, full_name)",
        )
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LandWithSeller | null;
    },
  });
}

export function useLandInventory() {
  return useQuery<Record<string, LandInventory>>({
    queryKey: LAND_INVENTORY_KEY,
    queryFn: async () => {
      const { data, error } = await client().from("land_inventory").select("*");
      if (error) throw error;
      const map: Record<string, LandInventory> = {};
      for (const row of data ?? []) map[row.land_id] = row;
      return map;
    },
  });
}

export function useLandInventoryFor(id: string | null | undefined) {
  const all = useLandInventory();
  const row = useMemo(() => (id ? all.data?.[id] : undefined), [all.data, id]);
  return { ...all, data: row };
}

export function useCreateLand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<TablesInsert<"land_projects">, "owner_id">,
    ) => {
      const { data, error } = await client()
        .from("land_projects")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LANDS_KEY });
      qc.invalidateQueries({ queryKey: LAND_INVENTORY_KEY });
    },
  });
}

export function useUpdateLand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: TablesUpdate<"land_projects">;
    }) => {
      const { data, error } = await client()
        .from("land_projects")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: LANDS_KEY });
      qc.invalidateQueries({ queryKey: [...LANDS_KEY, variables.id] });
      qc.invalidateQueries({ queryKey: LAND_INVENTORY_KEY });
    },
  });
}

export function useDeleteLand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client()
        .from("land_projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LANDS_KEY });
      qc.invalidateQueries({ queryKey: LAND_INVENTORY_KEY });
    },
  });
}
