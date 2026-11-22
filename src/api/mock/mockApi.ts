import type { EletroDashApi } from "../client";
import type {
  Alert,
  ChargingSession,
  ChargingSessionDetail,
  DailyPoint,
  DashboardSummary,
  LedgerSummary,
  Period,
  SessionEvent,
  SessionFilters,
} from "../types";
import { account, active, chargers, history, invoices, ledger, tariffs } from "./data";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 200));
const clone = <T>(v: T): T => structuredClone(v);
const HOUR = 3_600_000;

/** Recarga ativa com os números "ao vivo", calculados pelo tempo decorrido. */
function live(s: ChargingSession): ChargingSession {
  const hours = (Date.now() - new Date(s.startAt).getTime()) / HOUR;
  const maxWh = (s.prepaidCents / s.priceKwhCents) * 1000;
  const energyWh = Math.round(Math.min(maxWh, (s.powerW ?? 0) * hours));
  const gross = Math.round((energyWh * s.priceKwhCents) / 1000);
  const soc = s.socPct === null ? null : Math.min(100, Math.round(s.socPct + energyWh / 600));
  // Taxa e líquido estimados até agora; o valor final sai no fim da recarga.
  const fee = Math.round((gross * account.plan.pixFeeBps) / 10_000);
  return { ...s, energyWh, grossCents: gross, feeCents: fee, netCents: gross - fee, socPct: soc };
}

function inPeriod(iso: string, p: { from: string; to: string }) {
  return iso >= p.from && iso < p.to;
}

function totals(list: ChargingSession[]) {
  let grossCents = 0;
  let refundsCents = 0;
  let feesCents = 0;
  let energyWh = 0;
  let chargingMinutes = 0;
  let paid = 0;
  for (const s of list) {
    grossCents += s.grossCents;
    feesCents += s.feeCents;
    energyWh += s.energyWh;
    if (s.status === "refunded") refundsCents += s.refundedCents;
    if (s.endAt) {
      chargingMinutes += (new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) / 60_000;
    }
    if (s.grossCents > 0) paid++;
  }
  return {
    grossCents,
    refundsCents,
    feesCents,
    netCents: grossCents - feesCents,
    energyWh,
    chargingMinutes: Math.round(chargingMinutes),
    sessions: list.filter((s) => s.status === "completed").length,
    avgTicketCents: paid ? Math.round(grossCents / paid) : 0,
  };
}

function buckets(period: Period): { bucket: "day" | "hour"; starts: Date[] } {
  const from = new Date(period.from);
  const to = new Date(period.to);
  const hourly = to.getTime() - from.getTime() <= 26 * HOUR;
  const starts: Date[] = [];
  const cur = new Date(from);
  // Por hora, só até a hora atual (o resto do dia ainda não aconteceu).
  const stop = hourly ? new Date(Math.min(to.getTime(), Date.now())) : to;
  while (cur < stop) {
    starts.push(new Date(cur));
    if (hourly) cur.setHours(cur.getHours() + 1);
    else cur.setDate(cur.getDate() + 1);
  }
  return { bucket: hourly ? "hour" : "day", starts };
}

function filterSessions(f: SessionFilters): ChargingSession[] {
  const all = [...active.map(live), ...history].sort((a, b) => b.startAt.localeCompare(a.startAt));
  const q = f.search?.trim().toLowerCase();
  return all.filter(
    (s) =>
      (!f.from || s.startAt >= f.from) &&
      (!f.to || s.startAt < f.to) &&
      (!f.status || s.status === f.status) &&
      (!f.method || s.method === f.method) &&
      (!f.chargerId || s.chargerId === f.chargerId) &&
      (!q ||
        s.id.toLowerCase().includes(q) ||
        s.driverLabel.toLowerCase().includes(q) ||
        s.chargerName.toLowerCase().includes(q)),
  );
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const brl = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export const mockApi: EletroDashApi = {
  async getSummary(period) {
    await delay();
    const cur = history.filter((s) => inPeriod(s.startAt, period));
    const len = new Date(period.to).getTime() - new Date(period.from).getTime();
    const prevPeriod = {
      from: new Date(new Date(period.from).getTime() - len).toISOString(),
      to: period.from,
    };
    const prev = totals(history.filter((s) => inPeriod(s.startAt, prevPeriod)));
    const { bucket, starts } = buckets(period);
    const daily: DailyPoint[] = starts.map((start, i) => {
      const end = starts[i + 1] ?? new Date(period.to);
      const p = { from: start.toISOString(), to: end.toISOString() };
      const list = cur.filter((s) => inPeriod(s.startAt, p));
      const t = totals(list);
      const card = list.filter((s) => s.method === "card").reduce((a, s) => a + s.grossCents, 0);
      return {
        date: p.from,
        grossCents: t.grossCents,
        pixCents: t.grossCents - card,
        cardCents: card,
        energyWh: t.energyWh,
        sessions: t.sessions,
      };
    });
    const summary: DashboardSummary = {
      period,
      ...totals(cur),
      previous: {
        grossCents: prev.grossCents,
        netCents: prev.netCents,
        energyWh: prev.energyWh,
        sessions: prev.sessions,
      },
      bucket,
      daily,
    };
    return summary;
  },

  async getActiveSessions() {
    await delay(150);
    return active.map(live);
  },

  async getAlerts() {
    await delay(150);
    const alerts: Alert[] = [];
    for (const c of chargers) {
      for (const con of c.connectors) {
        if (con.status === "offline") {
          alerts.push({
            id: `al_off_${con.id}`,
            kind: "offline",
            title: `${c.name} sem comunicação`,
            detail: `Conector ${con.number} offline · último sinal do carregador`,
            since: con.statusSince,
            chargerId: c.id,
          });
        } else if (con.status === "faulted") {
          alerts.push({
            id: `al_flt_${con.id}`,
            kind: "faulted",
            title: `${c.name} · conector ${con.number} em falha`,
            detail: "Erro informado pelo carregador (GroundFailure)",
            since: con.statusSince,
            chargerId: c.id,
          });
        } else if (con.status === "occupied") {
          alerts.push({
            id: `al_idle_${con.id}`,
            kind: "long_idle",
            title: `${c.name} · veículo parado após a recarga`,
            detail: "Ociosidade sendo cobrada por minuto",
            since: con.statusSince,
            chargerId: c.id,
          });
        }
      }
    }
    const open = invoices.find((i) => i.status === "open");
    if (open) {
      alerts.push({
        id: `al_inv_${open.id}`,
        kind: "invoice_due",
        title: "Mensalidade EletroPay em aberto",
        detail: `Vence em ${new Date(open.dueDate).toLocaleDateString("pt-BR")}`,
        since: open.dueDate,
      });
    }
    return alerts;
  },

  async listChargers() {
    await delay();
    return clone(chargers);
  },

  async getCharger(id) {
    await delay();
    const c = chargers.find((x) => x.id === id);
    return c ? clone(c) : null;
  },

  async listSessions(filters, page) {
    await delay();
    const all = filterSessions(filters);
    return { items: all.slice(page.offset, page.offset + page.limit), total: all.length };
  },

  async exportSessionsCsv(filters) {
    await delay();
    const head = [
      "ID",
      "Início",
      "Fim",
      "Carregador",
      "Conector",
      "Motorista",
      "kWh",
      "Bruto (R$)",
      "Taxa (R$)",
      "Líquido (R$)",
      "Devolvido (R$)",
      "Meio",
      "Status",
    ];
    const rows = filterSessions(filters).map((s) =>
      [
        s.id,
        s.startAt,
        s.endAt ?? "",
        s.chargerName,
        s.connectorNumber,
        s.driverLabel,
        (s.energyWh / 1000).toFixed(2).replace(".", ","),
        brl(s.grossCents),
        brl(s.feeCents),
        brl(s.netCents),
        brl(s.refundedCents),
        s.method,
        s.status,
      ]
        .map(csvCell)
        .join(";"),
    );
    return [head.join(";"), ...rows].join("\n");
  },

  async getSession(id) {
    await delay();
    const base = [...active.map(live), ...history].find((s) => s.id === id);
    if (!base) return null;
    const meterStart = 1_000_000 + (parseInt(base.id.slice(4), 10) % 9000) * 137;
    const t = (iso: string, plusMin: number) =>
      new Date(new Date(iso).getTime() + plusMin * 60_000).toISOString();
    const timeline: SessionEvent[] = [];
    if (base.method === "pix" || base.method === "card") {
      timeline.push({
        at: t(base.startAt, -2),
        label: base.method === "pix" ? "Pix confirmado" : "Cartão autorizado",
        detail: `Crédito de ${brl(base.prepaidCents)} reais, verificado na API do Asaas`,
      });
    } else if (base.method === "tag") {
      timeline.push({ at: t(base.startAt, -1), label: "Tag autorizada" });
    } else {
      timeline.push({ at: t(base.startAt, -1), label: "Liberada sem cobrança pelo operador" });
    }
    if (base.status === "failed") {
      timeline.push({ at: base.startAt, label: "Carregador não iniciou a recarga" });
    } else if (base.status === "cancelled") {
      timeline.push({ at: base.startAt, label: "Motorista cancelou antes de conectar" });
    } else {
      timeline.push({ at: base.startAt, label: "Recarga iniciada", detail: "StartTransaction" });
    }
    if (base.endAt && base.energyWh > 0) {
      timeline.push({ at: base.endAt, label: "Recarga encerrada", detail: "StopTransaction" });
    }
    if (base.endAt && base.grossCents > 0) {
      timeline.push({
        at: t(base.endAt, 1),
        label: "Cobrança final calculada",
        detail: `${brl(base.grossCents)} reais`,
      });
    }
    if (base.endAt && base.refundedCents > 0) {
      timeline.push({
        at: t(base.endAt, 2),
        label: "Devolução concluída",
        detail: `${brl(base.refundedCents)} reais via ${base.method === "pix" ? "Pix" : "cartão"}`,
      });
    }
    const detail: ChargingSessionDetail = {
      ...base,
      meterStartWh: meterStart,
      meterStopWh: base.endAt ? meterStart + base.energyWh : null,
      paymentProvider: "Asaas",
      paymentId: `pay_${base.id.slice(4)}x${(base.prepaidCents % 97).toString(36)}`,
      timeline,
    };
    return detail;
  },

  async listLedger(filters, page) {
    await delay();
    const list = ledger.filter(
      (e) =>
        (!filters.from || e.at >= filters.from) &&
        (!filters.to || e.at < filters.to) &&
        (!filters.reason || e.reason === filters.reason) &&
        (!filters.account || e.account === filters.account),
    );
    const summary: LedgerSummary[] = (["pix", "card"] as const).map((acc) => {
      const items = list.filter((e) => e.account === acc);
      const inCents = items.filter((e) => e.amountCents > 0).reduce((a, e) => a + e.amountCents, 0);
      const outCents = items
        .filter((e) => e.amountCents < 0)
        .reduce((a, e) => a - e.amountCents, 0);
      return {
        account: acc,
        entries: items.length,
        inCents,
        outCents,
        balanceCents: inCents - outCents,
      };
    });
    return {
      summary,
      page: { items: list.slice(page.offset, page.offset + page.limit), total: list.length },
    };
  },

  async listTariffs() {
    await delay();
    return clone(tariffs);
  },

  async listInvoices() {
    await delay();
    return clone(invoices);
  },

  async getAccount() {
    await delay();
    return clone(account);
  },

  async stopSession(id) {
    await delay(400);
    const i = active.findIndex((s) => s.id === id);
    if (i < 0) return;
    const s = live(active[i] as ChargingSession);
    active.splice(i, 1);
    const fee = Math.round((s.grossCents * account.plan.pixFeeBps) / 10_000);
    history.unshift({
      ...s,
      endAt: new Date().toISOString(),
      powerW: null,
      status: "completed",
      feeCents: fee,
      netCents: s.grossCents - fee,
      refundedCents: s.prepaidCents - s.grossCents,
    });
    const charger = chargers.find((c) => c.id === s.chargerId);
    const con = charger?.connectors.find((c) => c.number === s.connectorNumber);
    if (con) {
      con.status = "available";
      con.statusSince = new Date().toISOString();
    }
  },
};
