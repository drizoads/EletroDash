// Guarda no navegador o que foi alterado no protótipo, para não sumir ao
// recarregar a página. Só existe enquanto os dados são falsos.

import type { Account, Charger, ChargerPatch, NotificationPrefs, Tariff } from "../types";

const KEY = "eletrodash-demo-v1";

export interface DemoChanges {
  account?: Account;
  notifications?: NotificationPrefs;
  tariffs?: Tariff[];
  addedChargers?: Charger[];
  chargerPatches?: Record<string, ChargerPatch>;
  readNotices?: string[];
}

export const saved: DemoChanges = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as DemoChanges;
  } catch {
    return {};
  }
})();

export function persist(patch: Partial<DemoChanges>) {
  Object.assign(saved, patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    /* sem armazenamento: a alteração vale só até recarregar */
  }
}

export function clearDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada a fazer */
  }
}
