/** fetch wrapper: cookie auth, JSON or FormData in, JSON out, server `message` surfaced as the Error message. */
export async function request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const isForm = body instanceof FormData;
  const headers: Record<string, string> = { ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }), ...extraHeaders };
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: Object.keys(headers).length ? headers : undefined,
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new Error("Network error — is the backend running?", { cause: err });
  }
  const data: { message?: string; error?: string } | undefined = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error(data?.message ?? data?.error ?? `Server error (HTTP ${res.status})`);
  return data as T;
}
