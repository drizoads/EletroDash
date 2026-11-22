import type {
  Account,
  AccountPatch,
  Alert,
  Charger,
  ChargerPatch,
  ChargingSession,
  ChargingSessionDetail,
  DashboardSummary,
  Invoice,
  LedgerEntry,
  LedgerFilters,
  LedgerSummary,
  NewChargerInput,
  NewChargerResult,
  NotificationPrefs,
  Page,
  Period,
  SessionFilters,
  Tariff,
  TariffPatch,
  TeamUser,
} from "./types";

/**
 * Tudo o que o painel precisa do EletroPay. Hoje a implementação é falsa
 * (dados de exemplo); quando a API real existir, basta criar outra classe que
 * cumpra esta interface usando fetch e trocar a exportação em ./index.ts.
 */
export interface EletroDashApi {
  // Leitura
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
  getNotifications(): Promise<NotificationPrefs>;

  // Ações
  stopSession(id: string): Promise<void>;
  createCharger(input: NewChargerInput): Promise<NewChargerResult>;
  updateCharger(id: string, patch: ChargerPatch): Promise<Charger>;
  /** Cria uma nova versão do preço; recargas em andamento não mudam. */
  updateTariff(id: string, patch: TariffPatch): Promise<Tariff>;
  updateAccount(patch: AccountPatch): Promise<Account>;
  inviteUser(user: Omit<TeamUser, "active">): Promise<TeamUser>;
  updateUser(email: string, patch: Partial<Omit<TeamUser, "email">>): Promise<TeamUser>;
  removeUser(email: string): Promise<void>;
  updateNotifications(prefs: NotificationPrefs): Promise<NotificationPrefs>;

  /** Só no protótipo: apaga as alterações feitas e volta aos dados de exemplo. */
  resetDemo?(): Promise<void>;
}
