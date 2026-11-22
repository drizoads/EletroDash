import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  BatteryCharging,
  CircleDollarSign,
  Clock,
  Wallet,
  Zap,
} from "lucide-react";
import { api, type Alert } from "../api";
import { ActiveSessionsList } from "../components/ActiveSessions";
import { ConnectorDonut, EvolutionChart, type SeriesKey } from "../components/charts";
import {
  AnimatedNumber,
  Badge,
  Card,
  Empty,
  Loading,
  Segmented,
  SessionBadge,
  StatCard,
  stagger,
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

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

const kwhInt = (wh: number) => kwh(wh, 0);

function Hero() {
  const account = useApi(() => api.getAccount(), []);
  const today = useApi(() => api.getSummary(periodFor("today")), [], 30_000);
  const month = useApi(() => api.getSummary(periodFor("month")), [], 30_000);
  const lastMonth = useApi(() => api.getSummary(periodFor("lastMonth")), []);
  const active = useApi(() => api.getActiveSessions(), [], 10_000);

  const name = account.data?.owner.name;
  const t = today.data;
  const goal = lastMonth.data?.grossCents ?? 0;
  const mtd = month.data?.grossCents ?? 0;
  const pct = goal ? Math.min(100, (mtd / goal) * 100) : 0;
  const m = new Date().toLocaleDateString("pt-BR", { month: "long" });
  const monthName = m.charAt(0).toUpperCase() + m.slice(1);
  const live = active.data?.length ?? 0;

  return (
    <section className="rise halo border-line relative mb-8 overflow-hidden rounded-3xl border">
      <span className="via-accent/50 absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <div className="text-faint mb-3 min-h-4 text-[11px] font-medium tracking-[0.16em] uppercase">
            {account.data && `${account.data.operatorName} · Painel do proprietário`}
          </div>
          <h1 className="text-main text-[2.1rem] leading-[1.1] font-light tracking-[-0.035em] sm:text-[2.6rem]">
            {greeting()},{" "}
            {name ? (
              <span className="text-accent font-normal">{name}.</span>
            ) : (
              <span className="skeleton inline-block h-10 w-40 align-middle" />
            )}
          </h1>
          <div className="text-muted mt-4 max-w-xl text-[15px] leading-relaxed">
            {t ? (
              <>
                Hoje a operação já faturou{" "}
                <b className="text-main font-medium tabular">
                  <AnimatedNumber value={t.grossCents} format={money} />
                </b>{" "}
                em <b className="text-main font-medium tabular">{int(t.sessions)} recargas</b>
                {live > 0 && (
                  <>
                    , e{" "}
                    <b className="text-main font-medium tabular">
                      {live} {live === 1 ? "carro está" : "carros estão"}
                    </b>{" "}
                    carregando agora
                  </>
                )}
                .
              </>
            ) : (
              <span className="skeleton block h-4 w-80 max-w-full" />
            )}
          </div>
        </div>

        <div className="border-line bg-surface/70 rounded-2xl border p-5 backdrop-blur">
          <div className="text-muted flex items-center justify-between text-[13px]">
            <span>{monthName} até agora</span>
            {goal > 0 && (
              <span className="text-faint text-xs tabular">
                {pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do mês passado
              </span>
            )}
          </div>
          <div className="text-main mt-2 text-[1.9rem] leading-none font-semibold tracking-[-0.02em] tabular">
            {month.data ? (
              <AnimatedNumber value={mtd} format={money} />
            ) : (
              <div className="skeleton h-8 w-40" />
            )}
          </div>
          <div className="bg-surface-2 mt-4 h-1.5 overflow-hidden rounded-full">
            <div
              className="from-accent-soft to-accent h-full rounded-full bg-gradient-to-r transition-[width] duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-faint mt-2 flex justify-between text-xs tabular">
            <span>{month.data && `${kwh(month.data.energyWh, 0)} entregues`}</span>
            <span>{goal > 0 && `Mês passado ${money(goal)}`}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

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

  // Ao trocar o período, os cards voltam ao estado "carregando" por um instante.
  const s = summary.loading ? undefined : summary.data;
  // Sparklines só até agora (no "Hoje", as horas futuras ainda estão vazias).
  const nowIso = new Date().toISOString();
  const past = s?.daily.filter((d) => d.date <= nowIso);
  const gross = past?.map((d) => d.grossCents);

  return (
    <>
      <Hero />

      <div
        className="rise mb-4 flex flex-wrap items-center justify-between gap-3"
        style={stagger(2)}
      >
        <h2 className="text-main text-sm font-medium">
          Desempenho{" "}
          <span className="text-faint font-normal">· {PRESET_LABEL[preset].toLowerCase()}</span>
        </h2>
        <Segmented
          value={preset}
          onChange={setPreset}
          options={PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          featured
          style={stagger(3)}
          label="Faturado"
          icon={<CircleDollarSign className="size-4" strokeWidth={1.6} />}
          value={s?.grossCents}
          format={money}
          spark={gross}
          hint={s && `Estornos ${money(s.refundsCents)}`}
          delta={s && delta(s.grossCents, s.previous.grossCents)}
          onClick={() => navigate("/financeiro")}
        />
        <StatCard
          style={stagger(4)}
          label="Líquido"
          icon={<Wallet className="size-4" strokeWidth={1.6} />}
          value={s?.netCents}
          format={money}
          spark={gross}
          hint={s && `Taxas EletroPay ${money(s.feesCents)}`}
          delta={s && delta(s.netCents, s.previous.netCents)}
          onClick={() => navigate("/financeiro")}
        />
        <StatCard
          style={stagger(5)}
          label="Energia entregue"
          icon={<Zap className="size-4" strokeWidth={1.6} />}
          value={s?.energyWh}
          format={kwhInt}
          spark={past?.map((d) => d.energyWh)}
          hint={s && `${int(Math.round(s.chargingMinutes / 60))} h de carregamento`}
          delta={s && delta(s.energyWh, s.previous.energyWh)}
        />
        <StatCard
          style={stagger(6)}
          label="Recargas"
          icon={<BatteryCharging className="size-4" strokeWidth={1.6} />}
          value={s?.sessions}
          format={int}
          spark={past?.map((d) => d.sessions)}
          hint={s && `Ticket médio ${money(s.avgTicketCents)}`}
          delta={s && delta(s.sessions, s.previous.sessions)}
          onClick={() => navigate("/recargas")}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          style={stagger(7)}
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
          {s ? (
            <EvolutionChart data={s.daily} bucket={s.bucket} series={series} />
          ) : (
            <Loading chart />
          )}
          {series === "gross" && (
            <div className="text-faint mt-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-accent size-2 rounded-full" /> Pix
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-info size-2 rounded-full" /> Cartão
              </span>
            </div>
          )}
        </Card>

        <Card
          style={stagger(8)}
          title="Conectores"
          action={
            <Link to="/carregadores" className="text-accent text-xs font-medium hover:underline">
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
            <Loading rows={5} />
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          style={stagger(9)}
          className="lg:col-span-2"
          title={
            <span className="flex items-center gap-2">
              Recargas ativas
              <Badge tone="blue" dot>
                {activeSessions.data?.length ?? 0} agora
              </Badge>
            </span>
          }
          action={
            <Link
              to="/recargas?status=charging&periodo=all"
              className="text-accent text-xs font-medium hover:underline"
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
            <Loading rows={3} />
          )}
        </Card>

        <Card
          style={stagger(10)}
          title={
            <span className="flex items-center gap-2">
              Precisa de atenção
              {!!alerts.data?.length && <Badge tone="red">{alerts.data.length}</Badge>}
            </span>
          }
        >
          {!alerts.data ? (
            <Loading rows={3} />
          ) : alerts.data.length === 0 ? (
            <Empty>Tudo certo por aqui.</Empty>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {alerts.data.map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.chargerId ? `/carregadores/${a.chargerId}` : "/financeiro/faturas"}
                    className="hover:bg-surface-2 group flex gap-3 rounded-xl p-2.5 transition-colors"
                  >
                    <AlertTriangle
                      strokeWidth={1.6}
                      className={
                        a.kind === "faulted"
                          ? "text-bad mt-0.5 size-4 shrink-0"
                          : "text-faint mt-0.5 size-4 shrink-0"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-main text-[13.5px] font-medium">{a.title}</div>
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
                    <ArrowUpRight className="text-faint size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        style={stagger(11)}
        className="mt-4"
        title="Últimas recargas concluídas"
        action={
          <Link to="/recargas" className="text-accent text-xs font-medium hover:underline">
            Ver histórico
          </Link>
        }
      >
        {!recent.data ? (
          <Loading rows={4} />
        ) : (
          <ul className="divide-line divide-y">
            {recent.data.items.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/recargas/${r.id}`}
                  className="hover:bg-surface-2 -mx-2 flex items-center gap-4 rounded-lg px-2 py-2.5 text-sm transition-colors"
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
