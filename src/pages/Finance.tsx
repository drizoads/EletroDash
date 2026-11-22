import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../api";
import { EvolutionChart } from "../components/charts";
import {
  Card,
  Loading,
  PageHeader,
  Segmented,
  StatCard,
  Table,
  Td,
  Th,
  stagger,
  MobileRow,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { delta, int, kwh, money } from "../lib/format";
import { PRESET_LABEL, periodFor, type PeriodPreset } from "../lib/period";

const PRESETS: PeriodPreset[] = ["7d", "30d", "month", "lastMonth"];

export function Finance() {
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const period = useMemo(() => periodFor(preset), [preset]);
  const summary = useApi(() => api.getSummary(period), [period]);
  const account = useApi(() => api.getAccount(), []);
  const s = summary.loading ? undefined : summary.data;
  const pix = s?.daily.reduce((a, d) => a + d.pixCents, 0) ?? 0;
  const card = s?.daily.reduce((a, d) => a + d.cardCents, 0) ?? 0;
  const plan = account.data?.plan;

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Quanto você vendeu, quanto ficou de taxa e quanto é seu."
        actions={
          <Segmented
            value={preset}
            onChange={setPreset}
            options={PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
          />
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          featured
          style={stagger(1)}
          label="Vendas brutas"
          value={s?.grossCents}
          format={money}
          spark={s?.daily.map((d) => d.grossCents)}
          delta={s && delta(s.grossCents, s.previous.grossCents)}
          hint={s && `Pix ${money(pix)} · Cartão ${money(card)}`}
        />
        <StatCard
          style={stagger(2)}
          label="Taxas EletroPay"
          value={s?.feesCents}
          format={money}
          hint={
            plan &&
            `Plano ${plan.name}: ${(plan.pixFeeBps / 100).toLocaleString("pt-BR")}% por recarga`
          }
        />
        <StatCard
          style={stagger(3)}
          label="Líquido"
          value={s?.netCents}
          format={money}
          delta={s && delta(s.netCents, s.previous.netCents)}
          hint="Vendas menos taxas"
        />
        <StatCard
          style={stagger(4)}
          label="Estornos"
          value={s?.refundsCents}
          format={money}
          hint="Recargas devolvidas por inteiro"
        />
      </div>

      <Card className="mt-4" title="Vendas por dia" style={stagger(5)}>
        {s ? <EvolutionChart data={s.daily} bucket={s.bucket} series="gross" /> : <Loading chart />}
      </Card>

      <Card
        className="mt-4"
        title="Tabela por dia"
        action={
          <Link to="/financeiro/conciliacoes" className="text-accent text-xs font-medium">
            Ver extrato completo
          </Link>
        }
      >
        {!s ? (
          <Loading />
        ) : (
          <Table
            mobile={[...s.daily].reverse().map((d) => (
              <MobileRow
                key={d.date}
                title={
                  <span className="capitalize">
                    {new Date(d.date).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                }
                subtitle={`${int(d.sessions)} recargas · ${kwh(d.energyWh)}`}
                right={money(d.grossCents)}
                rightSub={
                  <span className="text-faint text-xs">
                    Pix {money(d.pixCents)}
                    {d.cardCents > 0 && ` · Cartão ${money(d.cardCents)}`}
                  </span>
                }
              />
            ))}
          >
            <thead>
              <tr>
                <Th>Dia</Th>
                <Th right>Recargas</Th>
                <Th right>Energia</Th>
                <Th right>Pix</Th>
                <Th right>Cartão</Th>
                <Th right>Bruto</Th>
              </tr>
            </thead>
            <tbody>
              {[...s.daily].reverse().map((d) => (
                <tr key={d.date} className="hover:bg-surface-2/60">
                  <Td>
                    {new Date(d.date).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </Td>
                  <Td right muted>
                    {int(d.sessions)}
                  </Td>
                  <Td right muted>
                    {kwh(d.energyWh)}
                  </Td>
                  <Td right muted>
                    {money(d.pixCents)}
                  </Td>
                  <Td right muted>
                    {money(d.cardCents)}
                  </Td>
                  <Td right className="font-medium">
                    {money(d.grossCents)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
