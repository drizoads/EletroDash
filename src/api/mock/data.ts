// Dados de exemplo, gerados de forma determinística (mesma semente = mesmos
// dados). Nomes, valores e pessoas são fictícios.

import type {
  Account,
  Charger,
  ChargingSession,
  Connector,
  ConnectorStatus,
  Invoice,
  LedgerEntry,
  PaymentMethod,
  SessionStatus,
  Tariff,
} from "../types";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261122);
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)] as T;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Momento em que os dados foram gerados; tudo é relativo a ele. */
export const GENERATED_AT = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

export const PLAN = {
  name: "Essencial",
  monthlyPerChargerCents: 4990,
  pixFeeBps: 250, // 2,5%
  pixFeeFixedCents: 0,
};

export const CREDIT_OPTIONS_CENTS = [3000, 6000, 10000];

function fee(grossCents: number): number {
  if (grossCents <= 0) return 0;
  return Math.round((grossCents * PLAN.pixFeeBps) / 10_000) + PLAN.pixFeeFixedCents;
}

interface ChargerSeed {
  name: string;
  location: string;
  visibility: "public" | "private";
  maxKw: number;
  connectors: { type: Connector["type"]; maxKw: number }[];
  vendor: string;
  model: string;
  priceKwhCents: number;
}

const seeds: ChargerSeed[] = [
  {
    name: "Centro 01",
    location: "Av. Brasil, 1200 · Centro",
    visibility: "public",
    maxKw: 60,
    connectors: [
      { type: "CCS2", maxKw: 60 },
      { type: "Tipo 2", maxKw: 22 },
    ],
    vendor: "Voltrix",
    model: "DC60 Duo",
    priceKwhCents: 199,
  },
  {
    name: "Centro 02",
    location: "Av. Brasil, 1200 · Centro",
    visibility: "public",
    maxKw: 60,
    connectors: [
      { type: "CCS2", maxKw: 60 },
      { type: "CHAdeMO", maxKw: 50 },
    ],
    vendor: "Voltrix",
    model: "DC60 Duo",
    priceKwhCents: 199,
  },
  {
    name: "Shopping Norte",
    location: "Estacionamento G2 · Shopping Norte",
    visibility: "public",
    maxKw: 22,
    connectors: [
      { type: "Tipo 2", maxKw: 22 },
      { type: "Tipo 2", maxKw: 22 },
    ],
    vendor: "Amperis",
    model: "AC22 Twin",
    priceKwhCents: 159,
  },
  {
    name: "Parque Verde",
    location: "Condomínio Parque Verde · Garagem B",
    visibility: "private",
    maxKw: 7,
    connectors: [{ type: "Tipo 2", maxKw: 7 }],
    vendor: "Amperis",
    model: "AC7 Home",
    priceKwhCents: 129,
  },
  {
    name: "Hotel Serra Azul",
    location: "Rod. BR-364, km 12 · Hotel Serra Azul",
    visibility: "public",
    maxKw: 40,
    connectors: [{ type: "CCS2", maxKw: 40 }],
    vendor: "Voltrix",
    model: "DC40",
    priceKwhCents: 189,
  },
  {
    name: "Mercado Bom Preço",
    location: "Rua das Flores, 88 · Jardim América",
    visibility: "public",
    maxKw: 22,
    connectors: [
      { type: "Tipo 2", maxKw: 22 },
      { type: "Tipo 2", maxKw: 22 },
    ],
    vendor: "Amperis",
    model: "AC22 Twin",
    priceKwhCents: 159,
  },
];

// Situação "agora" de cada conector: [carregador][conector]
const nowStatus: ConnectorStatus[][] = [
  ["charging", "available"],
  ["charging", "faulted"],
  ["available", "charging"],
  ["occupied"],
  ["offline"],
  ["available", "available"],
];

export const chargers: Charger[] = seeds.map((s, i) => {
  const offline = nowStatus[i]?.every((st) => st === "offline") ?? false;
  return {
    id: `chg_${String(i + 1).padStart(3, "0")}`,
    name: s.name,
    code: `EP-${1040 + i}`,
    location: s.location,
    visibility: s.visibility,
    maxKw: s.maxKw,
    ocppId: `ELP-${s.vendor.toUpperCase().slice(0, 3)}-${String(1040 + i)}`,
    ocppVersion: "1.6",
    vendor: s.vendor,
    model: s.model,
    firmware: `${int(2, 4)}.${int(0, 9)}.${int(0, 20)}`,
    lastSeenAt: iso(GENERATED_AT - (offline ? 3 * HOUR + 12 * MINUTE : int(5, 50) * 1000)),
    priceKwhCents: s.priceKwhCents,
    activeThisMonth: true,
    connectors: s.connectors.map((c, j) => {
      const status = nowStatus[i]?.[j] ?? "available";
      const since =
        status === "offline"
          ? 3 * HOUR + 12 * MINUTE
          : status === "faulted"
            ? 47 * MINUTE
            : status === "charging"
              ? int(8, 35) * MINUTE
              : int(3, 90) * MINUTE;
      return {
        id: `con_${i + 1}_${j + 1}`,
        number: j + 1,
        type: c.type,
        maxKw: c.maxKw,
        status,
        statusSince: iso(GENERATED_AT - since),
      };
    }),
  };
});

const DDDS = ["69", "11", "21", "31", "41", "62", "65", "92"];
function maskedPhone(): string {
  return `(${pick(DDDS)}) 9••••-${String(int(0, 9999)).padStart(4, "0")}`;
}

// Curva de procura por hora do dia (0–23).
const HOUR_WEIGHT = [
  1, 0.5, 0.3, 0.2, 0.2, 0.4, 1, 2, 3, 3, 3, 3.5, 4, 3.5, 3, 3, 3.5, 4.5, 5, 4.5, 3.5, 2.5, 2, 1.5,
];
const HOUR_TOTAL = HOUR_WEIGHT.reduce((a, b) => a + b, 0);
function pickHour(): number {
  let r = rand() * HOUR_TOTAL;
  for (let h = 0; h < 24; h++) {
    r -= HOUR_WEIGHT[h] ?? 0;
    if (r <= 0) return h;
  }
  return 18;
}

let seq = 1;
const sessionId = () => `ses_${String(seq++).padStart(5, "0")}`;

function buildHistory(): ChargingSession[] {
  const out: ChargingSession[] = [];
  const today = new Date(GENERATED_AT);
  today.setHours(0, 0, 0, 0);
  for (let d = 75; d >= 0; d--) {
    const dayStart = today.getTime() - d * DAY;
    const weekday = new Date(dayStart).getDay();
    const base = weekday === 0 || weekday === 6 ? 7 : 10;
    const growth = 1 + (75 - d) / 150; // operação crescendo ao longo do tempo
    // Hoje: recargas espalhadas só pelo tempo já decorrido, com um mínimo
    // garantido para o painel nunca abrir vazio (é demonstração).
    const isToday = d === 0;
    const elapsed = GENERATED_AT - dayStart;
    const count = isToday
      ? Math.max(14, Math.round(base * growth * (elapsed / DAY) * 1.3))
      : Math.round(base * growth * between(0.7, 1.3));
    for (let k = 0; k < count; k++) {
      const ci = int(0, chargers.length - 1);
      const charger = chargers[ci] as Charger;
      const connector = pick(charger.connectors);
      const startMs = isToday
        ? dayStart + rand() * Math.max(elapsed - 12 * MINUTE, 5 * MINUTE)
        : dayStart + pickHour() * HOUR + int(0, 59) * MINUTE;
      const kw = Math.min(connector.maxKw, between(0.55, 0.95) * connector.maxKw);
      const credit = pick(CREDIT_OPTIONS_CENTS);
      const method: PaymentMethod =
        charger.visibility === "private"
          ? rand() < 0.85
            ? "tag"
            : "free"
          : rand() < 0.93
            ? "pix"
            : rand() < 0.6
              ? "card"
              : "free";
      const r = rand();
      const status: SessionStatus =
        r < 0.9 ? "completed" : r < 0.95 ? "failed" : r < 0.98 ? "cancelled" : "refunded";

      const price = charger.priceKwhCents;
      const maxWh = method === "pix" || method === "card" ? (credit / price) * 1000 : 60_000;
      const wantedWh = between(6_000, 48_000);
      let energyWh =
        status === "failed" || status === "cancelled" ? 0 : Math.round(Math.min(maxWh, wantedWh));
      let minutes = Math.max(4, Math.round((energyWh / 1000 / kw) * 60));
      const latestEnd = GENERATED_AT - 2 * MINUTE;
      if (isToday && startMs + minutes * MINUTE > latestEnd) {
        // Recarga de hoje mais curta, para já ter terminado.
        minutes = Math.floor((latestEnd - startMs) / MINUTE);
        if (minutes < 4) continue;
        if (energyWh > 0) energyWh = Math.round((kw * minutes * 1000) / 60);
      }
      const endMs = startMs + minutes * MINUTE;
      if (endMs > latestEnd) continue;

      const idleMinutes = status === "completed" && rand() < 0.15 ? int(3, 40) : 0;
      const idleCents = Math.max(0, idleMinutes - 10) * 50;
      const energyCents = Math.round((energyWh * price) / 1000);
      let gross = method === "free" ? 0 : energyCents + idleCents;
      if (method === "pix" || method === "card") gross = Math.min(gross, credit);
      const prepaid = method === "pix" || method === "card" ? credit : 0;
      let refunded = method === "pix" ? prepaid - gross : 0;
      if (status === "refunded") {
        // Pix devolve todo o crédito; no cartão só foi capturado o consumo.
        refunded = method === "pix" ? prepaid : gross;
      }
      const effectiveGross = status === "refunded" ? 0 : gross;
      const f = method === "pix" || method === "card" ? fee(effectiveGross) : 0;

      out.push({
        id: sessionId(),
        chargerId: charger.id,
        chargerName: charger.name,
        connectorNumber: connector.number,
        driverLabel: method === "tag" ? `Tag ${int(1000, 9999)}` : maskedPhone(),
        startAt: iso(startMs),
        endAt: iso(endMs),
        energyWh,
        powerW: null,
        socPct: null,
        priceKwhCents: price,
        tariffVersion: d > 30 ? 1 : 2,
        prepaidCents: prepaid,
        grossCents: effectiveGross,
        feeCents: f,
        netCents: effectiveGross - f,
        refundedCents: refunded,
        idleMinutes,
        idleCents: status === "refunded" ? 0 : idleCents,
        method,
        status,
      });
    }
  }
  return out;
}

function buildActive(): ChargingSession[] {
  const out: ChargingSession[] = [];
  chargers.forEach((charger) => {
    charger.connectors.forEach((c) => {
      if (c.status !== "charging") return;
      const credit = 10000;
      out.push({
        id: sessionId(),
        chargerId: charger.id,
        chargerName: charger.name,
        connectorNumber: c.number,
        driverLabel: maskedPhone(),
        startAt: c.statusSince,
        endAt: null,
        energyWh: 0,
        powerW: Math.round(c.maxKw * between(0.6, 0.9) * 1000),
        socPct: int(15, 55),
        priceKwhCents: charger.priceKwhCents,
        tariffVersion: 2,
        prepaidCents: credit,
        grossCents: 0,
        feeCents: 0,
        netCents: 0,
        refundedCents: 0,
        idleMinutes: 0,
        idleCents: 0,
        method: "pix",
        status: "charging",
      });
    });
  });
  return out;
}

export const history = buildHistory();
export const active = buildActive();

export const tariffs: Tariff[] = [
  {
    id: "tar_padrao",
    name: "Padrão DC (rápido)",
    appliesTo: "Centro 01, Centro 02",
    priceKwhCents: 199,
    idleGraceMin: 10,
    idlePriceMinCents: 50,
    minAmountCents: 3000,
    creditOptionsCents: CREDIT_OPTIONS_CENTS,
    version: 2,
    validFrom: iso(GENERATED_AT - 30 * DAY),
    createdBy: "Arthur",
  },
  {
    id: "tar_dc40",
    name: "DC 40 kW",
    appliesTo: "Hotel Serra Azul",
    priceKwhCents: 189,
    idleGraceMin: 10,
    idlePriceMinCents: 50,
    minAmountCents: 3000,
    creditOptionsCents: CREDIT_OPTIONS_CENTS,
    version: 2,
    validFrom: iso(GENERATED_AT - 30 * DAY),
    createdBy: "Arthur",
  },
  {
    id: "tar_ac",
    name: "AC 22 kW",
    appliesTo: "Shopping Norte, Mercado Bom Preço",
    priceKwhCents: 159,
    idleGraceMin: 15,
    idlePriceMinCents: 30,
    minAmountCents: 3000,
    creditOptionsCents: CREDIT_OPTIONS_CENTS,
    version: 1,
    validFrom: iso(GENERATED_AT - 75 * DAY),
    createdBy: "Arthur",
  },
  {
    id: "tar_cond",
    name: "Condomínio (tag)",
    appliesTo: "Parque Verde",
    priceKwhCents: 129,
    idleGraceMin: 60,
    idlePriceMinCents: 0,
    minAmountCents: 0,
    creditOptionsCents: [],
    version: 1,
    validFrom: iso(GENERATED_AT - 75 * DAY),
    createdBy: "Arthur",
  },
];

function buildInvoices(): Invoice[] {
  const out: Invoice[] = [];
  const now = new Date(GENERATED_AT);
  for (let m = 3; m >= 1; m--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const due = new Date(ref.getFullYear(), ref.getMonth() + 1, 5);
    const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
    const monthFees = history
      .filter((s) => s.startAt.slice(0, 7) === monthKey)
      .reduce((a, s) => a + s.feeCents, 0);
    const activeCount = m === 3 ? 5 : 6;
    const total = activeCount * PLAN.monthlyPerChargerCents;
    const overdue = due.getTime() < GENERATED_AT;
    out.push({
      id: `fat_${monthKey}`,
      referenceMonth: monthKey,
      activeChargers: activeCount,
      monthlyPerChargerCents: PLAN.monthlyPerChargerCents,
      feesCents: monthFees,
      totalCents: total,
      dueDate: iso(due.getTime()),
      status: overdue ? "paid" : "open",
      paidAt: overdue ? iso(due.getTime() - 2 * DAY) : null,
    });
  }
  return out.reverse();
}

export const invoices = buildInvoices();

function buildLedger(): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  let n = 1;
  const id = () => `lan_${String(n++).padStart(6, "0")}`;
  const netByDay = new Map<string, number>();
  for (const s of history) {
    if (s.prepaidCents === 0) continue;
    const account = s.method === "card" ? "card" : "pix";
    // Pix entra o crédito inteiro; cartão captura só o consumo.
    const entry = account === "card" ? s.grossCents + s.refundedCents : s.prepaidCents;
    if (entry === 0) continue;
    out.push({
      id: id(),
      at: s.startAt,
      reason: "recarga",
      account,
      counterparty: s.driverLabel,
      description: `Crédito de recarga · ${s.chargerName} #${s.connectorNumber}`,
      amountCents: entry,
      sessionId: s.id,
    });
    if (s.refundedCents > 0 && s.endAt) {
      out.push({
        id: id(),
        at: iso(new Date(s.endAt).getTime() + 2 * MINUTE),
        reason: "reembolso",
        account,
        counterparty: s.driverLabel,
        description:
          s.status === "refunded" || s.status === "failed"
            ? "Devolução integral"
            : "Devolução do crédito não usado",
        amountCents: -s.refundedCents,
        sessionId: s.id,
      });
    }
    if (s.feeCents > 0 && s.endAt) {
      out.push({
        id: id(),
        at: iso(new Date(s.endAt).getTime() + 3 * MINUTE),
        reason: "taxa",
        account,
        counterparty: "EletroPay",
        description: `Taxa por recarga (${(PLAN.pixFeeBps / 100).toLocaleString("pt-BR")}%)`,
        amountCents: -s.feeCents,
        sessionId: s.id,
      });
    }
    const day = (s.endAt ?? s.startAt).slice(0, 10);
    netByDay.set(day, (netByDay.get(day) ?? 0) + s.netCents);
  }
  // Saque diário do saldo líquido para a conta bancária do dono.
  for (const [day, net] of netByDay) {
    const at = new Date(`${day}T12:00:00.000Z`).getTime() + DAY;
    if (at > GENERATED_AT || net <= 0) continue;
    out.push({
      id: id(),
      at: iso(at),
      reason: "repasse",
      account: "pix",
      counterparty: "Conta Itaú ••• 4821",
      description: `Transferência do líquido de ${day.split("-").reverse().join("/")}`,
      amountCents: -net,
    });
  }
  for (const inv of invoices) {
    if (!inv.paidAt) continue;
    out.push({
      id: id(),
      at: inv.paidAt,
      reason: "mensalidade",
      account: "pix",
      counterparty: "EletroPay",
      description: `Mensalidade ${inv.referenceMonth.split("-").reverse().join("/")} · ${inv.activeChargers} carregadores`,
      amountCents: -inv.totalCents,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export const ledger = buildLedger();

export const account: Account = {
  operatorName: "Inova Solar",
  legalName: "Inova Solar Energia Ltda.",
  cnpjMasked: "12.345.•••/0001-••",
  asaasStatus: "approved",
  pixKeyMasked: "CNPJ ••.•••.678/0001-90",
  plan: PLAN,
  owner: { name: "Arthur", role: "Dono · Inova Solar" },
  users: [
    { name: "Arthur", email: "arthur@inovasolar.exemplo", role: "Dono", active: true },
    {
      name: "Financeiro",
      email: "financeiro@inovasolar.exemplo",
      role: "Financeiro",
      active: true,
    },
    { name: "Atendimento", email: "suporte@inovasolar.exemplo", role: "Suporte", active: false },
  ],
};
