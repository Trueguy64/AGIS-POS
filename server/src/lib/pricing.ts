/** Whole-baht unit price. Same arithmetic as the client (src/lib/gold.ts). */
export const unitPrice = (weight: number, purity: number, laborFee: number, thbPerGram: number) =>
  Math.round(weight * purity * thbPerGram + laborFee);
