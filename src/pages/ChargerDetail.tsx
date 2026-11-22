import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Power, QrCode, RefreshCw, Send, Unlock } from "lucide-react";
import { api } from "../api";
import { ActiveSessionsList } from "../components/ActiveSessions";
import {
  Button,
  Card,
  ConnectorBadge,
  Empty,
  KeyValue,
  Loading,
  PageHeader,
  Segmented,
  SessionBadge,
  Table,
  Td,
  Th,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { dateTime, kwh, money, pricePerKwh, since } from "../lib/format";

type Tab = "resumo" | "recargas" | "ocpp";

export function ChargerDetail() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("resumo");
  const charger = useApi(() => api.getCharger(id), [id], 10_000);
  const active = useApi(() => api.getActiveSessions(), [], 5_000);
  const sessions = useApi(
    () => api.listSessions({ chargerId: id }, { offset: 0, limit: 15 }),
    [id],
  );

  if (charger.loading && !charger.data) return <Loading />;
  const c = charger.data;
  if (!c) return <Empty>Carregador não encontrado.</Empty>;

  const running = active.data?.filter((s) => s.chargerId === c.id) ?? [];
  const command = (label: string) =>
    alert(`Protótipo: o comando "${label}" será enviado ao carregador pela central OCPP.`);

  return (
    <>
      <Link
        to="/carregadores"
        className="text-muted hover:text-main mb-3 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Carregadores
      </Link>
      <PageHeader
        title={c.name}
        subtitle={`${c.code} · ${c.location}`}
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "resumo", label: "Resumo" },
              { value: "recargas", label: "Recargas" },
              { value: "ocpp", label: "OCPP e comandos" },
            ]}
          />
        }
      />

      {tab === "resumo" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Conectores" className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {c.connectors.map((con) => (
                <div key={con.id} className="border-line rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-main font-medium">Conector {con.number}</span>
                    <ConnectorBadge status={con.status} />
                  </div>
                  <div className="text-faint mt-1 text-xs">
                    {con.type} · até {con.maxKw} kW · {since(con.statusSince)}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="text-main mt-6 mb-1 text-sm font-semibold">Recarga em andamento</h3>
            <ActiveSessionsList sessions={running} onStopped={active.reload} compact />
          </Card>
          <div className="flex flex-col gap-4">
            <Card title="Preço vigente">
              <div className="text-main text-2xl font-semibold tabular">
                {pricePerKwh(c.priceKwhCents)}
              </div>
              <Link
                to="/precos"
                className="text-brand-600 dark:text-brand-400 mt-1 inline-block text-xs font-medium"
              >
                Editar em Preços e regras
              </Link>
            </Card>
            <Card title="QR Code do carregador">
              <div className="flex items-center gap-4">
                <div className="bg-surface-2 border-line grid size-20 place-items-center rounded-lg border">
                  <QrCode className="text-muted size-12" />
                </div>
                <div className="text-muted text-xs">
                  O motorista lê o código e cai no WhatsApp do EletroPay com o código{" "}
                  <b className="text-main">{c.code}</b>.
                  <div className="mt-2">
                    <Button onClick={() => alert("Protótipo: download do QR Code em PDF.")}>
                      Baixar para imprimir
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "recargas" && (
        <Card title="Últimas recargas deste carregador">
          {!sessions.data ? (
            <Loading />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Início</Th>
                  <Th>Conector</Th>
                  <Th>Motorista</Th>
                  <Th right>Energia</Th>
                  <Th right>Valor</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/60">
                    <Td>
                      <Link to={`/recargas/${s.id}`} className="hover:underline">
                        {dateTime(s.startAt)}
                      </Link>
                    </Td>
                    <Td muted>#{s.connectorNumber}</Td>
                    <Td muted>{s.driverLabel}</Td>
                    <Td right>{kwh(s.energyWh)}</Td>
                    <Td right>{money(s.grossCents)}</Td>
                    <Td>
                      <SessionBadge status={s.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "ocpp" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Dados do equipamento">
            <KeyValue
              items={[
                ["Fabricante", c.vendor],
                ["Modelo", c.model],
                ["Firmware", c.firmware],
                ["Protocolo", `OCPP ${c.ocppVersion}`],
                ["ID da estação", c.ocppId],
                ["Último sinal", `${dateTime(c.lastSeenAt)} (${since(c.lastSeenAt)})`],
                ["Endereço da central", `wss://central.eletropay.com.br/ocpp/${c.ocppId}`],
              ]}
            />
          </Card>
          <Card title="Comandos remotos">
            <p className="text-muted mb-4 text-sm">
              Cada comando fica registrado no log de auditoria com o seu usuário.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button onClick={() => command("Reiniciar")}>
                <RefreshCw className="size-4" /> Reiniciar carregador
              </Button>
              <Button onClick={() => command("Destravar conector")}>
                <Unlock className="size-4" /> Destravar conector
              </Button>
              <Button onClick={() => command("Tornar indisponível")}>
                <Power className="size-4" /> Tornar indisponível
              </Button>
              <Button onClick={() => command("Pedir status")}>
                <Send className="size-4" /> Pedir status
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
