const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const intFmt = new Intl.NumberFormat("pt-BR");

/** Centavos inteiros → "R$ 1.234,56". */
export const money = (cents: number) => brlFmt.format(cents / 100);

/** Wh inteiros → "12,3 kWh". */
export const kwh = (wh: number, digits = 1) =>
  `${(wh / 1000).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} kWh`;

export const kw = (w: number) =>
  `${(w / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kW`;

export const int = (n: number) => intFmt.format(n);

export const pricePerKwh = (cents: number) => `${money(cents)}/kWh`;

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function duration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  if (h === 0) return `${m} min`;
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}min`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export const minutesBetween = (fromIso: string, toIso?: string | null) =>
  ((toIso ? new Date(toIso).getTime() : Date.now()) - new Date(fromIso).getTime()) / 60_000;

/** "há 12 min", "há 3h 05min". */
export const since = (iso: string) => `há ${duration(minutesBetween(iso))}`;

/** Variação percentual contra o período anterior; null se não há base. */
export function delta(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}
