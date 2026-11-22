import { useMemo, useState } from "react";
import { Link } from "react-router";
import { CreditCard, QrCode } from "lucide-react";
import { api, type LedgerReason } from "../api";
import {
  Badge,
  Card,
  Empty,
  Loading,
  PageHeader,
  Pagination,
  Select,
  Table,
  Td,
  Th,
  cx,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { dateTime, int, money } from "../lib/format";
import { PRESET_LABEL, periodFor, type PeriodPreset } from "../lib/period";

const LIMIT = 30;

const REASON: Record<
  LedgerReason,
  { label: string; tone: "green" | "amber" | "gray" | "blue" | "violet" }
> = {
  recarga: { label: "Recarga", tone: "green" },
  reembolso: { label: "Reembolso", tone: "amber" },
  taxa: { label: "Taxa", tone: "gray" },
  repasse: { label: "Repasse", tone: "blue" },
  mensalidade: { label: "Mensalidade", tone: "violet" },
};

export function Ledger() {
  const [preset, setPreset] = useState<PeriodPreset>("7d");
  const [reason, setReason] = useState<LedgerReason | "">("");
  const [account, setAccount] = useState<"pix" | "card" | "">("");
  const [offset, setOffset] = useState(0);

  const filters = useMemo(() => {
    const p = periodFor(preset);
    return { from: p.from, to: p.to, reason, account };
  }, [preset, reason, account]);
  const res = useApi(() => api.listLedger(filters, { offset, limit: LIMIT }), [filters, offset]);

  const reset =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      fn(v);
      setOffset(0);
    };

  return (
    <>
      <PageHeader
        title="Conciliações"
        subtitle="Extrato único de entradas e saídas: recargas, reembolsos, taxas, repasses e mensalidade."
      />

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {(res.data?.summary ?? []).map((s) => (
          <Card key={s.account}>
            <div className="flex items-center justify-between">
              <div className="text-main flex items-center gap-2 font-medium">
                {s.account === "pix" ? (
                  <QrCode className="size-4" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                {s.account === "pix" ? "Pix" : "Cartão"}
              </div>
              <span className="text-faint text-xs tabular">{int(s.entries)} lançamentos</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 tabular">
              <div>
                <div className="text-faint text-xs">Entradas</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {money(s.inCents)}
                </div>
              </div>
              <div>
                <div className="text-faint text-xs">Saídas</div>
                <div className="font-semibold text-rose-600 dark:text-rose-400">
                  {money(-s.outCents)}
                </div>
              </div>
              <div>
                <div className="text-faint text-xs">Saldo</div>
                <div className="text-main font-semibold">{money(s.balanceCents)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Select
            label="Período"
            value={preset}
            onChange={(v) => reset(setPreset)(v as PeriodPreset)}
          >
            {(Object.keys(PRESET_LABEL) as PeriodPreset[]).map((p) => (
              <option key={p} value={p}>
                {PRESET_LABEL[p]}
              </option>
            ))}
          </Select>
          <Select
            label="Motivo"
            value={reason}
            onChange={(v) => reset(setReason)(v as LedgerReason | "")}
          >
            <option value="">Todos</option>
            {(Object.keys(REASON) as LedgerReason[]).map((r) => (
              <option key={r} value={r}>
                {REASON[r].label}
              </option>
            ))}
          </Select>
          <Select
            label="Conta"
            value={account}
            onChange={(v) => reset(setAccount)(v as "pix" | "card" | "")}
          >
            <option value="">Todas</option>
            <option value="pix">Pix</option>
            <option value="card">Cartão</option>
          </Select>
        </div>
        {!res.data ? (
          <Loading />
        ) : res.data.page.items.length === 0 ? (
          <Empty>Nenhum lançamento com esses filtros.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Motivo</Th>
                  <Th>Conta</Th>
                  <Th>Contraparte</Th>
                  <Th>Descrição</Th>
                  <Th right>Valor</Th>
                </tr>
              </thead>
              <tbody>
                {res.data.page.items.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/60">
                    <Td muted>{dateTime(e.at)}</Td>
                    <Td>
                      <Badge tone={REASON[e.reason].tone}>{REASON[e.reason].label}</Badge>
                    </Td>
                    <Td muted>{e.account === "pix" ? "Pix" : "Cartão"}</Td>
                    <Td muted>{e.counterparty}</Td>
                    <Td>
                      {e.sessionId ? (
                        <Link to={`/recargas/${e.sessionId}`} className="hover:underline">
                          {e.description}
                        </Link>
                      ) : (
                        e.description
                      )}
                    </Td>
                    <Td
                      right
                      className={cx(
                        "font-medium",
                        e.amountCents >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {e.amountCents >= 0 ? "+ " : "− "}
                      {money(Math.abs(e.amountCents))}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              offset={offset}
              limit={LIMIT}
              total={res.data.page.total}
              onChange={setOffset}
            />
          </>
        )}
      </Card>
    </>
  );
}
