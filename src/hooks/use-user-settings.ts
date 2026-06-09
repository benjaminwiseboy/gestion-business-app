"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/lib/supabase/types";

type UserSettings = Tables<"user_settings">;

const USER_SETTINGS_KEY = ["user_settings"] as const;

function client() {
  return createClient();
}

export function useUserSettings() {
  return useQuery<UserSettings | null>({
    queryKey: USER_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await client()
        .from("user_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesUpdate<"user_settings">) => {
      const supabase = client();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("user_settings")
        .update(input)
        .eq("owner_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_SETTINGS_KEY });
      // Pivot conversions depend on the rate, so refetch loan_remaining
      // aggregates too.
      qc.invalidateQueries({ queryKey: ["loan_remaining"] });
    },
  });
}
