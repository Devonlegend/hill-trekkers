export function formatKobo(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined) return "TBA";
  const naira = kobo / 100;
  return `\u20A6${naira.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
