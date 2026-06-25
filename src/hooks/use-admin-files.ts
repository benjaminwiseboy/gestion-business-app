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

type AdminFile = Tables<"admin_files">;
type AdminRemaining = Views<"admin_file_remaining">;

export type AdminFileWithPersons = AdminFile & {
  beneficiary: { id: string; full_name: string } | null;
  surveyor: { id: string; full_name: string } | null;
};

const ADMIN_FILES_KEY = ["admin_files"] as const;
const ADMIN_REMAINING_KEY = ["admin_file_remaining"] as const;

function client() {
  return createClient();
}

export function useAdminFiles() {
  return useQuery<AdminFileWithPersons[]>({
    queryKey: ADMIN_FILES_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("admin_files")
        .select(
          "*, beneficiary:persons!admin_files_beneficiary_person_id_fkey(id, full_name), surveyor:persons!admin_files_surveyor_person_id_fkey(id, full_name)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminFileWithPersons[];
    },
  });
}

export function useAdminFilesForLand(landId: string | null | undefined) {
  const all = useAdminFiles();
  const filtered = (all.data ?? []).filter((f) => f.land_id === landId);
  return { ...all, data: landId ? filtered : [] };
}

export function useAdminFile(id: string | null | undefined) {
  return useQuery<AdminFileWithPersons | null>({
    queryKey: [...ADMIN_FILES_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await client()
        .from("admin_files")
        .select(
          "*, beneficiary:persons!admin_files_beneficiary_person_id_fkey(id, full_name), surveyor:persons!admin_files_surveyor_person_id_fkey(id, full_name)",
        )
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AdminFileWithPersons | null;
    },
  });
}

export function useAdminFileRemaining() {
  return useQuery<Record<string, AdminRemaining>>({
    queryKey: ADMIN_REMAINING_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("admin_file_remaining")
        .select("*");
      if (error) throw error;
      const map: Record<string, AdminRemaining> = {};
      for (const row of data ?? []) map[row.file_id] = row;
      return map;
    },
  });
}

export function useAdminFileRemainingFor(id: string | null | undefined) {
  const all = useAdminFileRemaining();
  const row = useMemo(() => (id ? all.data?.[id] : undefined), [all.data, id]);
  return { ...all, data: row };
}

export function useCreateAdminFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<TablesInsert<"admin_files">, "owner_id">,
    ) => {
      const { data, error } = await client()
        .from("admin_files")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_FILES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_REMAINING_KEY });
    },
  });
}

export function useUpdateAdminFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: TablesUpdate<"admin_files">;
    }) => {
      const { data, error } = await client()
        .from("admin_files")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ADMIN_FILES_KEY });
      qc.invalidateQueries({ queryKey: [...ADMIN_FILES_KEY, variables.id] });
      qc.invalidateQueries({ queryKey: ADMIN_REMAINING_KEY });
    },
  });
}

export function useDeleteAdminFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client()
        .from("admin_files")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_FILES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_REMAINING_KEY });
    },
  });
}
