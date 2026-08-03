import { formatKobo } from "@/lib/format";

export function PriceTag({ kobo, className = "" }: { kobo: number | null | undefined; className?: string }) {
  return <span className={className}>{formatKobo(kobo)}</span>;
}
