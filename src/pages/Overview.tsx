import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AlertTriangle, BatteryCharging, CircleDollarSign, Clock, Wallet, Zap } from "lucide-react";
import { api, type Alert } from "../api";
import { ActiveSessionsList } from "../components/ActiveSessions";
import { ConnectorDonut, EvolutionChart, type SeriesKey } from "../components/charts";
import {
  Badge,
  Card,
  Empty,
  Loading,
  PageHeader,
  Segmented,
  SessionBadge,
  StatCard,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { dateTime, delta, int, kwh, money, since } from "../lib/format";
import { PRESET_LABEL, periodFor, type PeriodPreset } from "../lib/period";

const PRESETS: PeriodPreset[] = ["today", "7d", "30d", "month"];

const ALERT_TONE: Record<Alert["kind"], "red" | "gray" | "amber" | "violet"> = {
  faulted: "red",
  offline: "gray",
  long_idle: "amber",
  refund_failed: "red",
  invoice_due: "violet",
};
const ALERT_LABEL: Record<Alert["kind"], string> = {
  faulted: "Em falha",
  offline: "Offline",
  long_idle: "Ociosidade",
  refund_failed: "Devolução",
  invoice_due: "Fatura",
};

export function Overview() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [series, setSeries] = useState<SeriesKey>("gross");
  const period = useMemo(() => periodFor(preset), [preset]);

  const summary = useApi(() => api.getSummary(period), [period]);
  const chargers = useApi(() => api.listChargers(), [], 10_000);
  const activeSessions = useApi(() => api.getActiveSessions(), [], 5_000);
  const alerts = useApi(() => api.getAlerts(), [], 15_000);
  const recent = useApi(
    () => api.listSessions({ status: "completed" }, { offset: 0, limit: 6 }),
    [],
    15_000,
  );

  const s = summary.data;

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="Resultados do período e situação dos carregadores agora."
        actions={
          <Segmented
            value={preset}
            onChange={setPreset}
            options={PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Faturado"
          icon={<CircleDollarSign className="size-4" />}
          value={s ? money(s.grossCents) : "—"}
          hint={s && `Estornos ${money(s.refundsCents)}`}
          delta={s ? delta(s.grossCents, s.previous.grossCents) : undefined}
          onClick={() => navigate("/financeiro")}
        />
        <StatCard
          label="Líquido"
          icon={<Wallet className="size-4" />}
          value={s ? money(s.netCents) : "—"}
          hint={s && `Taxas EletroPay ${money(s.feesCents)}`}
          delta={s ? delta(s.netCents, s.previous.netCents) : undefined}
          onClick={() => navigate("/financeiro")}
        />
        <StatCard
          label="Energia entregue"
          icon={<Zap className="size-4" />}
          value={s ? kwh(s.energyWh, 0) : "—"}
          hint={s && `Tempo carregando ${int(Math.round(s.chargingMinutes / 60))} h`}
          delta={s ? delta(s.energyWh, s.previous.energyWh) : undefined}
        />
        <StatCard
          label="Recargas"
          icon={<BatteryCharging className="size-4" />}
          value={s ? int(s.sessions) : "—"}
          hint={s && `Ticket médio ${money(s.avgTicketCents)}`}
          delta={s ? delta(s.sessions, s.previous.sessions) : undefined}
          onClick={() => navigate("/recargas")}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title={s?.bucket === "hour" ? "Evolução por hora" : "Evolução diária"}
          action={
            <Segmented
              value={series}
              onChange={setSeries}
              options={[
                { value: "gross", label: "Faturado" },
                { value: "energy", label: "Energia" },
                { value: "sessions", label: "Recargas" },
              ]}
            />
          }
        >
          {s ? <EvolutionChart data={s.daily} bucket={s.bucket} series={series} /> : <Loading />}
          {series === "gross" && s && (
            <div className="text-faint mt-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-brand-500 size-2 rounded-sm" /> Pix
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-sky-500" /> Cartão
              </span>
            </div>
          )}
        </Card>

        <Card
          title="Conectores"
          action={
            <Link
              to="/carregadores"
              className="text-brand-600 dark:text-brand-400 text-xs font-medium"
            >
              Ver carregadores
            </Link>
          }
        >
          {chargers.data ? (
            <ConnectorDonut
              chargers={chargers.data}
              onSelect={(st) => navigate(`/carregadores?status=${st}`)}
            />
          ) : (
            <Loading />
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title={
            <span className="flex items-center gap-2">
              Recargas ativas
              <Badge tone="blue">{activeSessions.data?.length ?? 0}</Badge>
            </span>
          }
          action={
            <Link
              to="/recargas?status=charging"
              className="text-brand-600 dark:text-brand-400 text-xs font-medium"
            >
              Ver todas
            </Link>
          }
        >
          {activeSessions.data ? (
            <ActiveSessionsList
              sessions={activeSessions.data}
              onStopped={() => {
                activeSessions.reload();
                chargers.reload();
                recent.reload();
              }}
            />
          ) : (
            <Loading />
          )}
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              Alertas
              <Badge tone={alerts.data?.length ? "red" : "green"}>{alerts.data?.length ?? 0}</Badge>
            </span>
          }
        >
          {!alerts.data ? (
            <Loading />
          ) : alerts.data.length === 0 ? (
            <Empty>Tudo certo por aqui.</Empty>
          ) : (
            <ul className="space-y-2">
              {alerts.data.map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.chargerId ? `/carregadores/${a.chargerId}` : "/financeiro/faturas"}
                    className="border-line hover:bg-surface-2 flex gap-3 rounded-xl border p-3"
                  >
                    <AlertTriangle
                      className={
                        a.kind === "faulted"
                          ? "mt-0.5 size-4 shrink-0 text-rose-500"
                          : "text-faint mt-0.5 size-4 shrink-0"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-main text-sm font-medium">{a.title}</div>
                      <div className="text-faint text-xs">{a.detail}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge tone={ALERT_TONE[a.kind]}>{ALERT_LABEL[a.kind]}</Badge>
                        {a.kind !== "invoice_due" && (
                          <span className="text-faint flex items-center gap-1 text-[11px]">
                            <Clock className="size-3" />
                            {since(a.since)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        className="mt-4"
        title="Últimas recargas concluídas"
        action={
          <Link to="/recargas" className="text-brand-600 dark:text-brand-400 text-xs font-medium">
            Ver histórico
          </Link>
        }
      >
        {!recent.data ? (
          <Loading />
        ) : (
          <ul className="divide-line divide-y">
            {recent.data.items.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/recargas/${r.id}`}
                  className="hover:bg-surface-2 -mx-2 flex items-center gap-4 rounded-lg px-2 py-2.5 text-sm"
                >
                  <span className="text-faint w-28 shrink-0 tabular">
                    {dateTime(r.endAt ?? r.startAt)}
                  </span>
                  <span className="text-main min-w-0 flex-1 truncate">
                    {r.chargerName}
                    <span className="text-faint"> · conector {r.connectorNumber}</span>
                  </span>
                  <span className="text-muted hidden w-20 text-right tabular sm:block">
                    {kwh(r.energyWh)}
                  </span>
                  <span className="text-main w-24 text-right font-medium tabular">
                    {money(r.grossCents)}
                  </span>
                  <span className="hidden md:block">
                    <SessionBadge status={r.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
