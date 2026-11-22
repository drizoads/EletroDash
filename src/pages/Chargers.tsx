import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Lock, Globe, Plus } from "lucide-react";
import { api, type ConnectorStatus } from "../api";
import { NewChargerWizard } from "../components/ChargerForms";
import {
  Badge,
  Button,
  CONNECTOR_STATUS,
  Card,
  ConnectorBadge,
  Empty,
  Loading,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { pricePerKwh, since } from "../lib/format";

export function Chargers() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as ConnectorStatus | "";
  const visibility = params.get("tipo") ?? "";
  const chargers = useApi(() => api.listChargers(), [], 10_000);
  const active = useApi(() => api.getActiveSessions(), [], 5_000);
  const [wizard, setWizard] = useState(false);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const rows = useMemo(
    () =>
      (chargers.data ?? []).filter(
        (c) =>
          (!status || c.connectors.some((con) => con.status === status)) &&
          (!visibility || c.visibility === visibility),
      ),
    [chargers.data, status, visibility],
  );

  return (
    <>
      <PageHeader
        title="Carregadores"
        subtitle="Status em tempo real, preço vigente e conexão OCPP de cada carregador."
        actions={
          <Button variant="primary" onClick={() => setWizard(true)}>
            <Plus className="size-4" /> Novo carregador
          </Button>
        }
      />
      <NewChargerWizard
        open={wizard}
        onClose={() => setWizard(false)}
        onCreated={chargers.reload}
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Select label="Status do conector" value={status} onChange={(v) => set("status", v)}>
            <option value="">Todos</option>
            {(Object.keys(CONNECTOR_STATUS) as ConnectorStatus[]).map((s) => (
              <option key={s} value={s}>
                {CONNECTOR_STATUS[s].label}
              </option>
            ))}
          </Select>
          <Select label="Tipo" value={visibility} onChange={(v) => set("tipo", v)}>
            <option value="">Todos</option>
            <option value="public">Público</option>
            <option value="private">Privado</option>
          </Select>
        </div>
        {!chargers.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>Nenhum carregador com esses filtros.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Carregador</Th>
                <Th>Tipo</Th>
                <Th right>Potência</Th>
                <Th>Conectores</Th>
                <Th>Recarga atual</Th>
                <Th right>Preço</Th>
                <Th>Último sinal</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const running = active.data?.filter((s) => s.chargerId === c.id) ?? [];
                return (
                  <tr key={c.id} className="hover:bg-surface-2/60">
                    <Td>
                      <Link to={`/carregadores/${c.id}`} className="block">
                        <div className="text-main font-medium hover:underline">{c.name}</div>
                        <div className="text-faint text-xs">
                          {c.code} · {c.location}
                        </div>
                      </Link>
                    </Td>
                    <Td muted>
                      <span className="inline-flex items-center gap-1.5">
                        {c.visibility === "public" ? (
                          <Globe className="size-3.5" />
                        ) : (
                          <Lock className="size-3.5" />
                        )}
                        {c.visibility === "public" ? "Público" : "Privado"}
                      </span>
                    </Td>
                    <Td right muted>
                      {c.maxKw} kW
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        {c.connectors.map((con) => (
                          <div key={con.id} className="flex items-center gap-2">
                            <span className="text-faint w-16 text-xs">
                              #{con.number} {con.type}
                            </span>
                            <ConnectorBadge status={con.status} />
                          </div>
                        ))}
                      </div>
                    </Td>
                    <Td muted>
                      {running.length === 0
                        ? "—"
                        : running.map((s) => (
                            <Link
                              key={s.id}
                              to={`/recargas/${s.id}`}
                              className="block text-xs hover:underline"
                            >
                              #{s.connectorNumber} · {(s.energyWh / 1000).toFixed(1)} kWh
                            </Link>
                          ))}
                    </Td>
                    <Td right>{pricePerKwh(c.priceKwhCents)}</Td>
                    <Td muted>
                      {c.pendingBoot ? (
                        <Badge tone="violet" dot>
                          Aguardando conexão
                        </Badge>
                      ) : c.connectors.every((con) => con.status === "offline") ? (
                        <Badge tone="gray">{since(c.lastSeenAt)}</Badge>
                      ) : (
                        <span className="text-xs">{since(c.lastSeenAt)}</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
