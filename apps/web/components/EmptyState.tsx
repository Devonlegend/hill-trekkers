export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-sand text-2xl">⛰️</span>
      <p className="font-semibold text-forest">{title}</p>
      {message && <p className="max-w-sm text-sm text-foreground/60">{message}</p>}
    </div>
  );
}
