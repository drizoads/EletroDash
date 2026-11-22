import { Link, useParams } from "react-router";
import { ArrowLeft, Receipt, Undo2 } from "lucide-react";
import { api } from "../api";
import {
  Button,
  Card,
  Empty,
  KeyValue,
  Loading,
  METHOD_LABEL,
  PageHeader,
  SessionBadge,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import {
  dateTime,
  duration,
  int,
  kw,
  kwh,
  minutesBetween,
  money,
  pricePerKwh,
} from "../lib/format";

export function SessionDetail() {
  const { id = "" } = useParams();
  const res = useApi(() => api.getSession(id), [id], 5_000);
  if (res.loading && !res.data) return <Loading />;
  const s = res.data;
  if (!s) return <Empty>Recarga não encontrada.</Empty>;
  const live = s.status === "charging";

  return (
    <>
      <Link
        to="/recargas"
        className="text-muted hover:text-main mb-3 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Recargas
      </Link>
      <PageHeader
        title={`Recarga ${s.id}`}
        subtitle={`${s.chargerName} · conector ${s.connectorNumber} · ${dateTime(s.startAt)}`}
        actions={
          <>
            <SessionBadge status={s.status} />
            {!live && s.grossCents > 0 && (
              <Button
                variant="secondary"
                onClick={() =>
                  alert("Protótipo: estorno total ou parcial, com motivo, via API do EletroPay.")
                }
              >
                <Undo2 className="size-4" /> Estornar
              </Button>
            )}
            <Button onClick={() => alert("Protótipo: comprovante em PDF.")}>
              <Receipt className="size-4" /> Comprovante
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Consumo">
            <KeyValue
              items={[
                ["Energia", kwh(s.energyWh, 2)],
                ["Duração", duration(minutesBetween(s.startAt, s.endAt))],
                ["Medidor inicial", `${int(s.meterStartWh)} Wh`],
                ["Medidor final", s.meterStopWh === null ? "—" : `${int(s.meterStopWh)} Wh`],
                ["Preço aplicado", `${pricePerKwh(s.priceKwhCents)} (versão ${s.tariffVersion})`],
                [
                  "Ociosidade",
                  s.idleMinutes ? `${s.idleMinutes} min · ${money(s.idleCents)}` : "—",
                ],
                ...(live
                  ? ([
                      ["Potência agora", kw(s.powerW ?? 0)],
                      ["Bateria do veículo", s.socPct === null ? "—" : `${s.socPct}%`],
                    ] as [string, string][])
                  : []),
              ]}
            />
          </Card>
          <Card title="Pagamento">
            <KeyValue
              items={[
                ["Meio", METHOD_LABEL[s.method]],
                ["Motorista", s.driverLabel],
                ["Provedor", s.method === "pix" || s.method === "card" ? s.paymentProvider : "—"],
                ["ID do pagamento", s.method === "pix" || s.method === "card" ? s.paymentId : "—"],
                ["Crédito pago", money(s.prepaidCents)],
                ["Valor cobrado", money(s.grossCents)],
                ["Devolvido ao motorista", money(s.refundedCents)],
                ["Taxa EletroPay", money(s.feeCents)],
                ["Líquido para o posto", money(s.netCents)],
              ]}
            />
          </Card>
        </div>

        <Card title="Linha do tempo">
          <ol className="border-line relative ml-2 border-l">
            {s.timeline.map((e, i) => (
              <li key={i} className="mb-5 ml-4 last:mb-0">
                <span className="bg-accent ring-surface absolute -left-[5px] mt-1.5 size-2.5 rounded-full ring-4 [--tw-ring-color:var(--surface)]" />
                <div className="text-main text-sm font-medium">{e.label}</div>
                <div className="text-faint text-xs tabular">{dateTime(e.at)}</div>
                {e.detail && <div className="text-muted mt-0.5 text-xs">{e.detail}</div>}
              </li>
            ))}
            {live && (
              <li className="ml-4">
                <span className="live-dot absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-info" />
                <div className="text-main text-sm font-medium">Carregando…</div>
                <div className="text-faint text-xs">
                  {kwh(s.energyWh)} · {money(s.grossCents)} até agora
                </div>
              </li>
            )}
          </ol>
        </Card>
      </div>
    </>
  );
}
