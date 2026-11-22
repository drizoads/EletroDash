import { useState } from "react";
import { Link } from "react-router";
import { BatteryMedium, Loader2, Square } from "lucide-react";
import { api, type ChargingSession } from "../api";
import { duration, kw, kwh, minutesBetween, money } from "../lib/format";
import { Button, Empty } from "./ui";

/** Lista de recargas em andamento com botão de parar. */
export function ActiveSessionsList({
  sessions,
  onStopped,
  compact,
}: {
  sessions: ChargingSession[];
  onStopped: () => void;
  compact?: boolean;
}) {
  const [stopping, setStopping] = useState<string | null>(null);

  async function stop(s: ChargingSession) {
    const ok = window.confirm(
      `Parar a recarga em ${s.chargerName} (conector ${s.connectorNumber})?\n` +
        "O motorista recebe de volta o crédito não usado.",
    );
    if (!ok) return;
    setStopping(s.id);
    try {
      await api.stopSession(s.id);
      onStopped();
    } finally {
      setStopping(null);
    }
  }

  if (sessions.length === 0) return <Empty>Nenhuma recarga em andamento agora.</Empty>;

  return (
    <ul className="divide-line divide-y">
      {sessions.map((s) => {
        const limitWh = (s.prepaidCents / s.priceKwhCents) * 1000;
        const pct = Math.min(100, (s.energyWh / limitWh) * 100);
        return (
          <li key={s.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="live-dot bg-info size-2 shrink-0 rounded-full" />
                <Link
                  to={`/recargas/${s.id}`}
                  className="text-main truncate text-sm font-medium hover:underline"
                >
                  {s.chargerName}
                </Link>
                <span className="text-faint shrink-0 text-xs">#{s.connectorNumber}</span>
                <button
                  onClick={() => stop(s)}
                  disabled={stopping === s.id}
                  aria-label={`Parar recarga em ${s.chargerName}`}
                  className="border-bad/25 text-bad active:bg-bad/15 ml-auto grid size-8 shrink-0 place-items-center rounded-full border transition-colors disabled:opacity-50 sm:hidden"
                >
                  {stopping === s.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Square className="size-3" fill="currentColor" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="bg-surface-2 h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-accent h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-faint text-xs tabular">
                  {kwh(s.energyWh)} de {kwh(limitWh, 0)}
                </span>
              </div>
            </div>
            <div
              className={`text-muted grid gap-3 text-xs tabular sm:flex sm:items-center sm:gap-4 ${compact ? "grid-cols-3" : "grid-cols-4"}`}
            >
              <div>
                <div className="text-faint">Potência</div>
                <div className="text-main font-medium">{kw(s.powerW ?? 0)}</div>
              </div>
              <div>
                <div className="text-faint">Valor</div>
                <div className="text-main font-medium">{money(s.grossCents)}</div>
              </div>
              <div>
                <div className="text-faint">Tempo</div>
                <div className="text-main font-medium">{duration(minutesBetween(s.startAt))}</div>
              </div>
              {!compact && (
                <div>
                  <div className="text-faint">Bateria</div>
                  <div className="text-main flex items-center gap-1 font-medium">
                    <BatteryMedium className="size-3.5" />
                    {s.socPct === null ? "—" : `${s.socPct}%`}
                  </div>
                </div>
              )}
            </div>
            <div className="hidden sm:block">
              <Button variant="danger" onClick={() => stop(s)} disabled={stopping === s.id}>
                <Square className="size-3.5" fill="currentColor" />
                {stopping === s.id ? "Parando…" : "Parar"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
