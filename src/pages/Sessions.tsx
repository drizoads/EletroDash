import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Download, Search } from "lucide-react";
import { api, type PaymentMethod, type SessionFilters, type SessionStatus } from "../api";
import {
  Button,
  Card,
  Empty,
  Loading,
  METHOD_LABEL,
  PageHeader,
  Pagination,
  SESSION_STATUS,
  Select,
  SessionBadge,
  Table,
  Td,
  Th,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { dateTime, duration, kwh, minutesBetween, money } from "../lib/format";
import { PRESET_LABEL, periodFor, type PeriodPreset } from "../lib/period";

const LIMIT = 25;

export function Sessions() {
  const [params, setParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const preset = (params.get("periodo") ?? "30d") as PeriodPreset | "all";
  const status = (params.get("status") ?? "") as SessionStatus | "";
  const method = (params.get("meio") ?? "") as PaymentMethod | "";
  const chargerId = params.get("carregador") ?? "";

  const chargers = useApi(() => api.listChargers(), []);
  const filters: SessionFilters = useMemo(() => {
    const p = preset === "all" ? null : periodFor(preset);
    return { from: p?.from, to: p?.to, status, method, chargerId, search };
  }, [preset, status, method, chargerId, search]);

  const page = useApi(
    () => api.listSessions(filters, { offset, limit: LIMIT }),
    [filters, offset],
    status === "charging" ? 5_000 : undefined,
  );

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setOffset(0);
  };

  async function exportCsv() {
    const csv = await api.exportSessionsCsv(filters);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recargas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Recargas"
        subtitle="Histórico completo, com valor bruto, taxa, líquido e devoluções."
        actions={
          <Button onClick={exportCsv}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Select label="Período" value={preset} onChange={(v) => set("periodo", v)}>
            {(Object.keys(PRESET_LABEL) as PeriodPreset[]).map((p) => (
              <option key={p} value={p}>
                {PRESET_LABEL[p]}
              </option>
            ))}
            <option value="all">Tudo</option>
          </Select>
          <Select label="Status" value={status} onChange={(v) => set("status", v)}>
            <option value="">Todos</option>
            {(Object.keys(SESSION_STATUS) as SessionStatus[]).map((s) => (
              <option key={s} value={s}>
                {SESSION_STATUS[s].label}
              </option>
            ))}
          </Select>
          <Select label="Meio" value={method} onChange={(v) => set("meio", v)}>
            <option value="">Todos</option>
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </Select>
          <Select label="Carregador" value={chargerId} onChange={(v) => set("carregador", v)}>
            <option value="">Todos</option>
            {chargers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <label className="flex min-w-48 flex-1 flex-col gap-1">
            <span className="text-faint text-xs font-medium">Buscar</span>
            <div className="bg-surface border-line focus-within:ring-accent/40 flex h-9 items-center gap-2 rounded-lg border px-2.5 focus-within:ring-2">
              <Search className="text-faint size-4" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder="ID, telefone ou tag"
                className="text-main placeholder:text-faint w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>
        </div>

        {!page.data ? (
          <Loading />
        ) : page.data.items.length === 0 ? (
          <Empty>Nenhuma recarga com esses filtros.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Início</Th>
                  <Th>Carregador</Th>
                  <Th>Motorista</Th>
                  <Th right>Energia</Th>
                  <Th right>Duração</Th>
                  <Th right>Bruto</Th>
                  <Th right>Taxa</Th>
                  <Th right>Líquido</Th>
                  <Th right>Devolvido</Th>
                  <Th>Meio</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {page.data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/60">
                    <Td>
                      <Link to={`/recargas/${s.id}`} className="hover:underline">
                        <div>{dateTime(s.startAt)}</div>
                        <div className="text-faint text-xs">{s.id}</div>
                      </Link>
                    </Td>
                    <Td>
                      {s.chargerName}
                      <span className="text-faint"> #{s.connectorNumber}</span>
                    </Td>
                    <Td muted>{s.driverLabel}</Td>
                    <Td right>{kwh(s.energyWh)}</Td>
                    <Td right muted>
                      {duration(minutesBetween(s.startAt, s.endAt))}
                    </Td>
                    <Td right>{money(s.grossCents)}</Td>
                    <Td right muted>
                      {s.feeCents ? `− ${money(s.feeCents)}` : "—"}
                    </Td>
                    <Td right className="font-medium">
                      {money(s.netCents)}
                    </Td>
                    <Td right muted>
                      {s.refundedCents ? money(s.refundedCents) : "—"}
                    </Td>
                    <Td muted>{METHOD_LABEL[s.method]}</Td>
                    <Td>
                      <SessionBadge status={s.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              offset={offset}
              limit={LIMIT}
              total={page.data.total}
              onChange={setOffset}
            />
          </>
        )}
      </Card>
    </>
  );
}
