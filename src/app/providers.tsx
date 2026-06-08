"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function ensureSession() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Anonymous sign-in failed:", error.message);
        }
        return;
      }
      // A session was just minted — re-run any queries that fired before it.
      queryClient.invalidateQueries();
    }

    ensureSession();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
