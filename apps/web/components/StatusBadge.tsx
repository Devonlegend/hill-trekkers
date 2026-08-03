const COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-gray-200 text-gray-700",
  refunded: "bg-violet-100 text-violet-800",
  expired: "bg-gray-200 text-gray-600",
  success: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  abandoned: "bg-gray-200 text-gray-600",
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${COLORS[s] ?? COLORS.pending}`}>
      {s}
    </span>
  );
}
