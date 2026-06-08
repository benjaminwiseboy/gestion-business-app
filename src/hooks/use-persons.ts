"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

type Person = Tables<"persons">;

const PERSONS_KEY = ["persons"] as const;

function client() {
  return createClient();
}

export function usePersons() {
  return useQuery<Person[]>({
    queryKey: PERSONS_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("persons")
        .select("*")
        .is("deleted_at", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function usePerson(id: string | null | undefined) {
  return useQuery<Person | null>({
    queryKey: [...PERSONS_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await client()
        .from("persons")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"persons">, "owner_id">) => {
      const { data, error } = await client()
        .from("persons")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERSONS_KEY });
    },
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: TablesUpdate<"persons">;
    }) => {
      const { data, error } = await client()
        .from("persons")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: PERSONS_KEY });
      qc.invalidateQueries({ queryKey: [...PERSONS_KEY, variables.id] });
    },
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client()
        .from("persons")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERSONS_KEY });
    },
  });
}

/** Convenience hook for fuzzy search filtering of the cached list. */
export function useFilteredPersons(search: string) {
  const query = usePersons();
  const filtered = useMemo(() => {
    if (!query.data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return query.data;
    return query.data.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false) ||
        (p.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [query.data, search]);
  return { ...query, data: filtered };
}
