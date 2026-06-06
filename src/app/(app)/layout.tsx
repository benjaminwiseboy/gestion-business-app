export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-sm font-semibold tracking-tight">
          Gestion Business
        </h1>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
    </div>
  );
}
