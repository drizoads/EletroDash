import type { EletroDashApi } from "./client";
import { mockApi } from "./mock/mockApi";

// Troque aqui pela implementação real (fetch na API do EletroPay) quando ela existir.
export const api: EletroDashApi = mockApi;

export type { EletroDashApi } from "./client";
export * from "./types";
