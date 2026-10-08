export type Block = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
export type Msg = { role: "user" | "assistant"; content: string | Block[] };
export type Tool = { name: string; description: string; input_schema: object };
export class ModelUnavailable extends Error {}

/** Anthropic-format Messages call (MiniMax gateway). One retry on 5xx/network; 4xx is not retried. */
export function createModel(o: { baseUrl: string; apiKey: string; model: string; fetch?: typeof fetch; timeoutMs?: number }) {
  const f = o.fetch ?? fetch;
  return async (system: string, messages: Msg[], tools: Tool[]): Promise<{ content: Block[]; stop_reason: string }> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await f(`${o.baseUrl}/v1/messages`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": o.apiKey, authorization: `Bearer ${o.apiKey}`, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: o.model, max_tokens: 1024, system, messages, tools }),
          signal: AbortSignal.timeout(o.timeoutMs ?? 30_000),
        });
        if (res.ok) return (await res.json()) as { content: Block[]; stop_reason: string };
        if (res.status < 500) throw new ModelUnavailable(`model HTTP ${res.status}`);
      } catch (e) {
        if (e instanceof ModelUnavailable) throw e;
      }
    }
    throw new ModelUnavailable("model unavailable after retry");
  };
}
