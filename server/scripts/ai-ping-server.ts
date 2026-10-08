// server/scripts/ai-ping-server.ts — deploy as a throwaway Render web service.
// Start command: npx tsx scripts/ai-ping-server.ts   Env: AI_BASE_URL, AI_API_KEY, AI_MODEL
import { createServer } from "node:http";
createServer(async (_req, res) => {
  try {
    const r = await fetch(`${process.env.AI_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.AI_API_KEY!, authorization: `Bearer ${process.env.AI_API_KEY}`, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.AI_MODEL ?? "minimax-m3", max_tokens: 32, messages: [{ role: "user", content: "Reply with the word OK." }] }),
      signal: AbortSignal.timeout(30_000),
    });
    res.writeHead(200, { "content-type": "text/plain" }).end(`${r.status} ${await r.text()}`);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
}).listen(Number(process.env.PORT ?? 3001));
