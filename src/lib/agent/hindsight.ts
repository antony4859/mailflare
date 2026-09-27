export type MemoryAccess = { read: boolean; write: boolean };

type McpResult = { error?: unknown; result?: { isError?: boolean; structuredContent?: Record<string, unknown>; content?: { type: string; text?: string }[] } };

export function hindsightBankId() {
	return "zimo-workspace";
}

export function hindsightConfigured(env: CloudflareEnv) {
	return !!env.HINDSIGHT_MCP_URL && !!env.HINDSIGHT_API_KEY;
}

export async function callHindsight(env: CloudflareEnv, mailboxId: string, tool: "recall" | "retain", args: Record<string, unknown>, access: MemoryAccess): Promise<string> {
	void mailboxId;
	if ((tool === "recall" && !access.read) || (tool === "retain" && !access.write)) throw new Error("Hindsight operation is disabled");
	if (!hindsightConfigured(env)) throw new Error("Hindsight is not connected");
	const base = new URL(env.HINDSIGHT_MCP_URL!);
	if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("Invalid Hindsight endpoint");
	const url = `${base.toString().replace(/\/$/, "")}/${hindsightBankId()}/`;
	const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${env.HINDSIGHT_API_KEY}` };
	if (env.HINDSIGHT_ACCESS_CLIENT_ID && env.HINDSIGHT_ACCESS_CLIENT_SECRET) {
		headers["CF-Access-Client-Id"] = env.HINDSIGHT_ACCESS_CLIENT_ID;
		headers["CF-Access-Client-Secret"] = env.HINDSIGHT_ACCESS_CLIENT_SECRET;
	}
	async function rpc(method: string, params: Record<string, unknown>, id?: number): Promise<McpResult> {
		const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", ...(id === undefined ? {} : { id }), method, params }), redirect: "error", signal: AbortSignal.timeout(45_000) });
		if (!response.ok) throw new Error(`Hindsight connection failed (${response.status})`);
		const session = response.headers.get("mcp-session-id");
		if (session) headers["mcp-session-id"] = session;
		if (id === undefined) { await response.body?.cancel(); return {}; }
		const reader = response.body?.getReader();
		if (!reader) throw new Error("Empty Hindsight response");
		const decoder = new TextDecoder();
		let text = "";
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				text += decoder.decode(value, { stream: true });
				if (text.length > 1_000_000) throw new Error("Hindsight response too large");
				if (response.headers.get("content-type")?.includes("text/event-stream")) {
					for (const event of text.split(/\r?\n\r?\n/).slice(0, -1)) {
						const data = event.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
						if (data) { const parsed = JSON.parse(data); if (parsed.id === id) return checked(parsed); }
					}
				}
			}
			return checked(JSON.parse(text));
		} finally { await reader.cancel(); }
	}
	function checked(value: McpResult): McpResult {
		if (value.error || value.result?.isError) throw new Error("Hindsight request failed");
		return value;
	}
	await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "zimo-mailflare", version: "1.0" } }, 1);
	await rpc("notifications/initialized", {});
	const result = await rpc("tools/call", { name: tool, arguments: args }, 2);
	const structured = result.result?.structuredContent;
	if (structured?.error) {
		if (tool === "recall" && String(structured.error).includes("not found")) return "No saved memory for this mailbox yet.";
		throw new Error("Hindsight operation failed");
	}
	return (result.result?.content ?? []).filter(item => item.type === "text").map(item => item.text ?? "").join("\n").slice(0, 16_000);
}
