// Contrato entre o EletroDash e a API do EletroPay.
// Regras herdadas do EletroPay: dinheiro em centavos inteiros, energia em Wh
// inteiros, datas em ISO 8601 (UTC). Nenhum CPF, token ou chave trafega aqui.

export type ConnectorStatus = "available" | "charging" | "occupied" | "faulted" | "offline";

export type ConnectorType = "CCS2" | "Tipo 2" | "CHAdeMO";

export interface Connector {
  id: string;
  number: number;
  type: ConnectorType;
  maxKw: number;
  status: ConnectorStatus;
  /** Desde quando o conector está no status atual. */
  statusSince: string;
}

export interface Charger {
  id: string;
  name: string;
  /** Código público do carregador, usado no WhatsApp (ex.: "EP-1042"). */
  code: string;
  location: string;
  visibility: "public" | "private";
  maxKw: number;
  ocppId: string;
  ocppVersion: "1.6" | "2.0.1";
  vendor: string;
  model: string;
  firmware: string;
  lastSeenAt: string;
  priceKwhCents: number;
  activeThisMonth: boolean;
  connectors: Connector[];
}

export type SessionStatus =
  "starting" | "charging" | "completed" | "failed" | "cancelled" | "refunded";

export type PaymentMethod = "pix" | "card" | "tag" | "free";

export interface ChargingSession {
  id: string;
  chargerId: string;
  chargerName: string;
  connectorNumber: number;
  /** Telefone mascarado ou identificação da tag; nunca o dado completo. */
  driverLabel: string;
  startAt: string;
  endAt: string | null;
  energyWh: number;
  /** Potência instantânea, só em recargas ativas. */
  powerW: number | null;
  /** Bateria do veículo, quando o carregador informa. */
  socPct: number | null;
  priceKwhCents: number;
  tariffVersion: number;
  /** Crédito pago no início (Pix) ou reservado (cartão). */
  prepaidCents: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
  refundedCents: number;
  idleMinutes: number;
  idleCents: number;
  method: PaymentMethod;
  status: SessionStatus;
}

export interface SessionEvent {
  at: string;
  label: string;
  detail?: string;
}

export interface ChargingSessionDetail extends ChargingSession {
  meterStartWh: number;
  meterStopWh: number | null;
  paymentProvider: "Asaas";
  paymentId: string;
  timeline: SessionEvent[];
}

export interface DailyPoint {
  /** Início do intervalo em ISO; um ponto por dia (ou por hora, se bucket = "hour"). */
  date: string;
  grossCents: number;
  pixCents: number;
  cardCents: number;
  energyWh: number;
  sessions: number;
}

export interface Period {
  from: string;
  to: string;
}

export interface DashboardSummary {
  period: Period;
  grossCents: number;
  refundsCents: number;
  feesCents: number;
  netCents: number;
  energyWh: number;
  chargingMinutes: number;
  sessions: number;
  avgTicketCents: number;
  /** Mesmos números do período anterior de mesmo tamanho, para comparação. */
  previous: { grossCents: number; netCents: number; energyWh: number; sessions: number };
  bucket: "day" | "hour";
  daily: DailyPoint[];
}

export type AlertKind = "offline" | "faulted" | "long_idle" | "refund_failed" | "invoice_due";

export interface Alert {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  since: string;
  chargerId?: string;
}

export type LedgerReason = "recarga" | "reembolso" | "taxa" | "repasse" | "mensalidade";

export interface LedgerEntry {
  id: string;
  at: string;
  reason: LedgerReason;
  account: "pix" | "card";
  counterparty: string;
  description: string;
  /** Positivo = entrada, negativo = saída. */
  amountCents: number;
  sessionId?: string;
}

export interface LedgerSummary {
  account: "pix" | "card";
  entries: number;
  inCents: number;
  outCents: number;
  balanceCents: number;
}

export interface Tariff {
  id: string;
  name: string;
  appliesTo: string;
  priceKwhCents: number;
  idleGraceMin: number;
  idlePriceMinCents: number;
  minAmountCents: number;
  creditOptionsCents: number[];
  version: number;
  validFrom: string;
  createdBy: string;
}

export type InvoiceStatus = "open" | "paid" | "overdue";

export interface Invoice {
  id: string;
  referenceMonth: string; // AAAA-MM
  activeChargers: number;
  monthlyPerChargerCents: number;
  feesCents: number;
  totalCents: number;
  dueDate: string;
  status: InvoiceStatus;
  paidAt: string | null;
}

export interface Plan {
  name: string;
  monthlyPerChargerCents: number;
  pixFeeBps: number;
  pixFeeFixedCents: number;
}

export interface Account {
  operatorName: string;
  legalName: string;
  cnpjMasked: string;
  asaasStatus: "pending" | "approved" | "rejected";
  pixKeyMasked: string;
  plan: Plan;
  /** Quem está logado no painel. */
  owner: { name: string; role: string };
  users: { name: string; email: string; role: string; active: boolean }[];
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface SessionFilters {
  from?: string;
  to?: string;
  status?: SessionStatus | "";
  method?: PaymentMethod | "";
  chargerId?: string;
  search?: string;
}

export interface LedgerFilters {
  from?: string;
  to?: string;
  reason?: LedgerReason | "";
  account?: "pix" | "card" | "";
}
