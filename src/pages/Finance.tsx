import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../api";
import { EvolutionChart } from "../components/charts";
import { Card, Loading, PageHeader, Segmented, StatCard, Table, Td, Th } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { delta, int, kwh, money } from "../lib/format";
import { PRESET_LABEL, periodFor, type PeriodPreset } from "../lib/period";

const PRESETS: PeriodPreset[] = ["7d", "30d", "month", "lastMonth"];

export function Finance() {
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const period = useMemo(() => periodFor(preset), [preset]);
  const summary = useApi(() => api.getSummary(period), [period]);
  const account = useApi(() => api.getAccount(), []);
  const s = summary.data;
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vendas brutas"
          value={s ? money(s.grossCents) : "—"}
          delta={s ? delta(s.grossCents, s.previous.grossCents) : undefined}
          hint={s && `Pix ${money(pix)} · Cartão ${money(card)}`}
        />
        <StatCard
          label="Taxas EletroPay"
          value={s ? money(s.feesCents) : "—"}
          hint={
            plan &&
            `Plano ${plan.name}: ${(plan.pixFeeBps / 100).toLocaleString("pt-BR")}% por recarga`
          }
        />
        <StatCard
          label="Líquido"
          value={s ? money(s.netCents) : "—"}
          delta={s ? delta(s.netCents, s.previous.netCents) : undefined}
          hint="Vendas menos taxas"
        />
        <StatCard
          label="Estornos"
          value={s ? money(s.refundsCents) : "—"}
          hint="Recargas devolvidas por inteiro"
        />
      </div>

      <Card className="mt-4" title="Vendas por dia">
        {s ? <EvolutionChart data={s.daily} bucket={s.bucket} series="gross" /> : <Loading />}
      </Card>

      <Card
        className="mt-4"
        title="Tabela por dia"
        action={
          <Link
            to="/financeiro/conciliacoes"
            className="text-brand-600 dark:text-brand-400 text-xs font-medium"
          >
            Ver extrato completo
          </Link>
        }
      >
        {!s ? (
          <Loading />
        ) : (
          <Table>
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
