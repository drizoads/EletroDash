import { useState } from "react";
import { Link } from "react-router";
import { BatteryMedium, Square } from "lucide-react";
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
          <li key={s.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="live-dot size-2 rounded-full bg-sky-500" />
                <Link
                  to={`/recargas/${s.id}`}
                  className="text-main truncate text-sm font-medium hover:underline"
                >
                  {s.chargerName}
                </Link>
                <span className="text-faint text-xs">conector {s.connectorNumber}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="bg-surface-2 h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-faint text-xs tabular">
                  {kwh(s.energyWh)} de {kwh(limitWh, 0)}
                </span>
              </div>
            </div>
            <div className="text-muted grid grid-cols-4 gap-4 text-xs tabular sm:flex sm:items-center">
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
            <Button variant="danger" onClick={() => stop(s)} disabled={stopping === s.id}>
              <Square className="size-3.5" fill="currentColor" />
              {stopping === s.id ? "Parando…" : "Parar"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
