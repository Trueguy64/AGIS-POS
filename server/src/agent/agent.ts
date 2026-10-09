import type { Block, Msg, Tool } from "./model";
import type { createModel } from "./model";
import type { createReservations, QuoteCard } from "../reservations/service";

const SYSTEM = `You are the reservation assistant for a Thai gold shop. Customers are remote (tourists, expats, online buyers) and write in English.
Prices are live: gold weight × purity × today's rate + a fixed labour fee. Never state a price you did not get from a tool.
Flow: use searchCatalog to suggest up to 3 pieces; when the customer picks one, call quotePrice and present the quote with this policy, word for word:
"The deposit holds this piece and this price for 48 hours. If it is not collected in time, the deposit is forfeited."
Quote only the one piece the customer picked. Item ids come only from searchCatalog in this message; if you no longer have the id, call searchCatalog again by the piece's name first.
Once there is a quote and the customer has given a name and a phone number or email anywhere in the conversation, that is acceptance: call createReservation right away with the quoteId (the active quote, if one is listed below). Do not repeat the quote or ask for details already given. Say the piece is reserved and point to the PayPal button only after createReservation succeeds; if it fails, say so and fix it (e.g. get a fresh quote).
If a tool returns an error about an expired or used quote, call quotePrice again. After a reservation is made, give the customer its reference (R- and six characters) to show at the counter. If a customer gives a reference, call findReservation and tell them the piece, its status, until when it is held, and the balance to pay in store.
Keep replies under 80 words, in plain sentences. Never write links or URLs: the page shows its own PayPal button. Weights: 1 baht = 15.244 g, 1 salueng = 3.81 g.`;

const TOOLS: Tool[] = [
  { name: "searchCatalog", description: "Find in-stock pieces by keyword (e.g. 'necklace 1 baht') and optional max price in THB.", input_schema: { type: "object", properties: { query: { type: "string" }, maxPriceTHB: { type: "number" } }, required: ["query"] } },
  { name: "quotePrice", description: "Lock a live-rate quote for one piece for 15 minutes. Returns price, 10% deposit and quoteId.", input_schema: { type: "object", properties: { itemId: { type: "string" } }, required: ["itemId"] } },
  { name: "findReservation", description: "Look up a reservation by the reference the customer was given (e.g. R-7K2Q9M). Returns the piece, status, hold time, price, deposit and balance.", input_schema: { type: "object", properties: { ref: { type: "string" } }, required: ["ref"] } },
  { name: "createReservation", description: "Reserve the quoted piece and create the PayPal deposit order. Needs the customer's name and phone or email.", input_schema: { type: "object", properties: { quoteId: { type: "string" }, customerName: { type: "string" }, contact: { type: "string" } }, required: ["quoteId", "customerName", "contact"] } },
];

export type ChatResult = { reply: string; quote?: QuoteCard; reservation?: { reservationId: string; ref: string; paypalOrderId: string; currency: string } };
type Res = Pick<ReturnType<typeof createReservations>, "quotePrice" | "createReservation" | "activeQuote" | "releaseExpired" | "findByRef">;

export function createAgent({ call, reservations, searchCatalog }: { call: ReturnType<typeof createModel>; reservations: Res; searchCatalog: (q: { query: string; maxPriceTHB?: number }) => Promise<unknown[]> }) {
  return {
    async chat({ messages, activeQuoteId, clientIp }: { messages: { role: "user" | "assistant"; content: string }[]; activeQuoteId?: string; clientIp?: string }): Promise<ChatResult> {
      const active = activeQuoteId ? await reservations.activeQuote(activeQuoteId) : null;
      const system = active ? `${SYSTEM}\nActive quote ${active.quoteId}: ${active.title}, price ${active.priceTHB} THB, deposit ${active.depositAmount} ${active.currency}, expires ${active.expiresAt}.` : SYSTEM;
      const convo: Msg[] = messages.map((m) => ({ role: m.role, content: m.content }));
      const result: ChatResult = { reply: "" };
      let reservedThisTurn = false, quotedThisTurn = false;

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
            else if (u.name === "quotePrice") {
              // The page keeps one quote; a second one here would leave the model and the page disagreeing.
              if (quotedThisTurn) throw new Error("Only one quote per message: quote the piece the customer picked");
              value = result.quote = await reservations.quotePrice(String(u.input.itemId ?? "")).catch((e) => {
                // Chat history is text only, so ids from earlier messages are gone; point the model at the fix.
                if ((e as { code?: string }).code === "NOT_FOUND") throw new Error(`${(e as Error).message}: item ids come from searchCatalog. Call searchCatalog with the piece's name, then quotePrice with the id it returns.`);
                throw e;
              });
              quotedThisTurn = true; // only a quote that exists counts; a failed one may be retried
            }
            else if (u.name === "createReservation") {
              if (reservedThisTurn) throw new Error("Only one reservation per message");
              reservedThisTurn = true;
              value = result.reservation = await reservations.createReservation({ quoteId: String(u.input.quoteId ?? ""), customerName: String(u.input.customerName ?? ""), contact: String(u.input.contact ?? ""), clientIp });
            } else if (u.name === "findReservation") value = (await reservations.findByRef(String(u.input.ref ?? ""))) ?? "No reservation with that reference. Ask the customer to check it.";
            else throw new Error(`Unknown tool ${u.name}`);
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
