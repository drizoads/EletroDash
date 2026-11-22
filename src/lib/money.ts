/** "1,99" ou "R$ 1.234,50" → centavos inteiros; null se não for um valor válido. */
export function parseMoney(text: string): number | null {
  const clean = text
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** Centavos → "1,99" (para preencher campos). */
export const toMoneyInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
