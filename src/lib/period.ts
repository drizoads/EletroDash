import type { Period } from "../api";

export type PeriodPreset = "today" | "7d" | "30d" | "month" | "lastMonth";

export const PRESET_LABEL: Record<PeriodPreset, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  month: "Este mês",
  lastMonth: "Mês passado",
};

/** Período em horário local, convertido para ISO (UTC). `to` é exclusivo. */
export function periodFor(preset: PeriodPreset, now = new Date()): Period {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const tomorrow = new Date(start);
  tomorrow.setDate(tomorrow.getDate() + 1);
  switch (preset) {
    case "today":
      return { from: start.toISOString(), to: tomorrow.toISOString() };
    case "7d": {
      const from = new Date(start);
      from.setDate(from.getDate() - 6);
      return { from: from.toISOString(), to: tomorrow.toISOString() };
    }
    case "30d": {
      const from = new Date(start);
      from.setDate(from.getDate() - 29);
      return { from: from.toISOString(), to: tomorrow.toISOString() };
    }
    case "month": {
      const from = new Date(start.getFullYear(), start.getMonth(), 1);
      return { from: from.toISOString(), to: tomorrow.toISOString() };
    }
    case "lastMonth": {
      const from = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      const to = new Date(start.getFullYear(), start.getMonth(), 1);
      return { from: from.toISOString(), to: to.toISOString() };
    }
  }
}
