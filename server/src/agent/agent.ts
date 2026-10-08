import type { Block, Msg, Tool } from "./model";
import type { createModel } from "./model";
import type { createReservations, QuoteCard } from "../reservations/service";

const SYSTEM = `You are the reservation assistant for a Thai gold shop. Customers are remote (tourists, expats, online buyers) and write in English.
Prices are live: gold weight × purity × today's rate + a fixed labour fee. Never state a price you did not get from a tool.
Flow: use searchCatalog to suggest up to 3 pieces; when the customer picks one, call quotePrice and present the quote with this policy, word for word:
"The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited."
When the customer accepts and gives a name and a phone number or email, call createReservation with the quoteId. Then tell them to pay the deposit with the PayPal button below.
If a tool returns an error about an expired or used quote, call quotePrice again. Keep replies under 80 words. Weights: 1 baht = 15.244 g, 1 salueng = 3.81 g.`;

const TOOLS: Tool[] = [
  { name: "searchCatalog", description: "Find in-stock pieces by keyword (e.g. 'necklace 1 baht') and optional max price in THB.", input_schema: { type: "object", properties: { query: { type: "string" }, maxPriceTHB: { type: "number" } }, required: ["query"] } },
  { name: "quotePrice", description: "Lock a live-rate quote for one piece for 15 minutes. Returns price, 10% deposit and quoteId.", input_schema: { type: "object", properties: { itemId: { type: "string" } }, required: ["itemId"] } },
  { name: "createReservation", description: "Reserve the quoted piece and create the PayPal deposit order. Needs the customer's name and phone or email.", input_schema: { type: "object", properties: { quoteId: { type: "string" }, customerName: { type: "string" }, contact: { type: "string" } }, required: ["quoteId", "customerName", "contact"] } },
];

export type ChatResult = { reply: string; quote?: QuoteCard; reservation?: { reservationId: string; paypalOrderId: string; currency: string } };
type Res = Pick<ReturnType<typeof createReservations>, "quotePrice" | "createReservation" | "activeQuote" | "releaseExpired">;

export function createAgent({ call, reservations, searchCatalog }: { call: ReturnType<typeof createModel>; reservations: Res; searchCatalog: (q: { query: string; maxPriceTHB?: number }) => Promise<unknown[]> }) {
  return {
    async chat({ messages, activeQuoteId, clientIp }: { messages: { role: "user" | "assistant"; content: string }[]; activeQuoteId?: string; clientIp?: string }): Promise<ChatResult> {
      const active = activeQuoteId ? await reservations.activeQuote(activeQuoteId) : null;
      const system = active ? `${SYSTEM}\nActive quote ${active.quoteId}: ${active.title}, price ${active.priceTHB} THB, deposit ${active.depositAmount} ${active.currency}, expires ${active.expiresAt}.` : SYSTEM;
      const convo: Msg[] = messages.map((m) => ({ role: m.role, content: m.content }));
      const result: ChatResult = { reply: "" };
      let reservedThisTurn = false;

      for (let toolCalls = 0; ; ) {
        const out = await call(system, convo, TOOLS);
        const uses = out.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
        const text = out.content.filter((b): b is Extract<Block, { type: "text" }> => b.type === "text").map((b) => b.text).join("\n").trim();
        if (uses.length === 0 || toolCalls >= 5) { result.reply = text || "Sorry, could you rephrase that?"; return result; }
        convo.push({ role: "assistant", content: out.content });
        const results: Block[] = [];
        for (const u of uses) {
          toolCalls++;
          try {
            let value: unknown;
            if (toolCalls > 5) throw new Error("Tool limit reached for this message");
            if (u.name === "searchCatalog") value = await searchCatalog({ query: String(u.input.query ?? ""), maxPriceTHB: typeof u.input.maxPriceTHB === "number" ? u.input.maxPriceTHB : undefined });
            else if (u.name === "quotePrice") value = result.quote = await reservations.quotePrice(String(u.input.itemId ?? ""));
            else if (u.name === "createReservation") {
              if (reservedThisTurn) throw new Error("Only one reservation per message");
              reservedThisTurn = true;
              value = result.reservation = await reservations.createReservation({ quoteId: String(u.input.quoteId ?? ""), customerName: String(u.input.customerName ?? ""), contact: String(u.input.contact ?? ""), clientIp });
            } else throw new Error(`Unknown tool ${u.name}`);
            results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(value) });
          } catch (e) {
            results.push({ type: "tool_result", tool_use_id: u.id, content: (e as Error).message, is_error: true });
          }
        }
        convo.push({ role: "user", content: results });
      }
    },
  };
}
