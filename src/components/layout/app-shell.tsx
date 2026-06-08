import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
