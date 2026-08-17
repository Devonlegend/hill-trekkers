import { formatKobo } from "@/lib/format";

export function PriceTag({ kobo, className = "" }: { kobo: number | null | undefined; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatKobo(kobo)}</span>;
}
