import { Mountains } from "@phosphor-icons/react";

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-sand text-forest">
        <Mountains size={22} weight="duotone" />
      </span>
      <p className="font-semibold text-forest">{title}</p>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
    </div>
  );
}
