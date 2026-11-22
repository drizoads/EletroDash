import type {
  Account,
  Alert,
  Charger,
  ChargingSession,
  ChargingSessionDetail,
  DashboardSummary,
  Invoice,
  LedgerEntry,
  LedgerFilters,
  LedgerSummary,
  Page,
  Period,
  SessionFilters,
  Tariff,
} from "./types";

/**
 * Tudo o que o painel precisa do EletroPay. Hoje a implementação é falsa
 * (dados de exemplo); quando a API real existir, basta criar outra classe que
 * cumpra esta interface usando fetch e trocar a exportação em ./index.ts.
 */
export interface EletroDashApi {
  getSummary(period: Period): Promise<DashboardSummary>;
  getActiveSessions(): Promise<ChargingSession[]>;
  getAlerts(): Promise<Alert[]>;
  listChargers(): Promise<Charger[]>;
  getCharger(id: string): Promise<Charger | null>;
  listSessions(
    filters: SessionFilters,
    page: { offset: number; limit: number },
  ): Promise<Page<ChargingSession>>;
  exportSessionsCsv(filters: SessionFilters): Promise<string>;
  getSession(id: string): Promise<ChargingSessionDetail | null>;
  listLedger(
    filters: LedgerFilters,
    page: { offset: number; limit: number },
  ): Promise<{ summary: LedgerSummary[]; page: Page<LedgerEntry> }>;
  listTariffs(): Promise<Tariff[]>;
  listInvoices(): Promise<Invoice[]>;
  getAccount(): Promise<Account>;
  stopSession(id: string): Promise<void>;
}
