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

type LandProject = Tables<"land_projects">;
type LandRemaining = Views<"land_project_remaining">;

export type LandProjectWithClient = LandProject & {
  client: { id: string; full_name: string } | null;
};

const LAND_PROJECTS_KEY = ["land_projects"] as const;
const LAND_REMAINING_KEY = ["land_project_remaining"] as const;

function client() {
  return createClient();
}

export function useLandProjects() {
  return useQuery<LandProjectWithClient[]>({
    queryKey: LAND_PROJECTS_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("land_projects")
        .select("*, client:persons(id, full_name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LandProjectWithClient[];
    },
  });
}

export function useLandProject(id: string | null | undefined) {
  return useQuery<LandProjectWithClient | null>({
    queryKey: [...LAND_PROJECTS_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await client()
        .from("land_projects")
        .select("*, client:persons(id, full_name)")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LandProjectWithClient | null;
    },
  });
}

export function useLandRemaining() {
  return useQuery<Record<string, LandRemaining>>({
    queryKey: LAND_REMAINING_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("land_project_remaining")
        .select("*");
      if (error) throw error;
      const map: Record<string, LandRemaining> = {};
      for (const row of data ?? []) map[row.project_id] = row;
      return map;
    },
  });
}

export function useLandRemainingFor(id: string | null | undefined) {
  const all = useLandRemaining();
  const row = useMemo(() => (id ? all.data?.[id] : undefined), [all.data, id]);
  return { ...all, data: row };
}

export function useCreateLandProject() {
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
      qc.invalidateQueries({ queryKey: LAND_PROJECTS_KEY });
      qc.invalidateQueries({ queryKey: LAND_REMAINING_KEY });
    },
  });
}

export function useUpdateLandProject() {
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
      qc.invalidateQueries({ queryKey: LAND_PROJECTS_KEY });
      qc.invalidateQueries({
        queryKey: [...LAND_PROJECTS_KEY, variables.id],
      });
      qc.invalidateQueries({ queryKey: LAND_REMAINING_KEY });
    },
  });
}

export function useDeleteLandProject() {
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
      qc.invalidateQueries({ queryKey: LAND_PROJECTS_KEY });
      qc.invalidateQueries({ queryKey: LAND_REMAINING_KEY });
    },
  });
}
