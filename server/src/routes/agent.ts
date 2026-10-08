import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { getGoldRate } from "../lib/goldRate";
import { unitPrice } from "../lib/pricing";
import { rateLimit } from "../lib/rateLimit";
import { getReservations } from "../reservations";
import { createModel, ModelUnavailable } from "../agent/model";
import { createAgent } from "../agent/agent";

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1000) }).strict()).min(1).max(20),
  activeQuoteId: z.string().max(100).optional(),
});

/** Drop leading non-user messages (e.g. a prepended assistant greeting). */
export function trimToFirstUser<T extends { role: string }>(messages: T[]): T[] {
  const i = messages.findIndex((m) => m.role === "user");
  return i < 0 ? [] : messages.slice(i);
}

async function searchCatalog({ query, maxPriceTHB }: { query: string; maxPriceTHB?: number }) {
  await getReservations().releaseExpired();
  const rate = await getGoldRate();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const items = await prisma.item.findMany({ include: { category: true }, take: 200 });
  return items
    .filter((i) => i.stock - i.held > 0)
    .map((i) => ({ id: i.id, title: i.title, description: i.description, image: i.image, weight: i.weight, purity: i.purity, laborFee: i.laborFee, category: i.category?.name ?? null, inStock: true, priceTHB: unitPrice(i.weight, i.purity, i.laborFee, rate.thbPerGram) }))
    .filter((i) => maxPriceTHB === undefined || i.priceTHB <= maxPriceTHB)
    .filter((i) => words.length === 0 || words.some((w) => `${i.title} ${i.description ?? ""} ${i.category ?? ""}`.toLowerCase().includes(w)))
    .slice(0, 5);
}

const router = Router();
let agent: ReturnType<typeof createAgent> | null = null;

router.post("/chat", rateLimit({ windowMs: 10 * 60_000, max: 20 }), async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid chat request" }); return; }
  const messages = trimToFirstUser(parsed.data.messages);
  if (messages.length === 0) { res.status(400).json({ message: "Invalid chat request" }); return; }
  agent ??= createAgent({
    call: createModel({ baseUrl: process.env.AI_BASE_URL ?? "", apiKey: process.env.AI_API_KEY ?? "", model: process.env.AI_MODEL ?? "minimax-m3" }),
    reservations: getReservations(),
    searchCatalog,
  });
  try {
    res.json(await agent.chat({ ...parsed.data, messages, clientIp: req.ip }));
  } catch (e) {
    if (e instanceof ModelUnavailable) { res.status(503).json({ message: "The assistant is unavailable, please try again shortly." }); return; }
    throw e;
  }
});

export default router;
