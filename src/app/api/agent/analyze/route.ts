import { z } from "zod";
import { getEnv } from "@/lib/cloudflare";
import { getCurrentUser } from "@/lib/auth/cookies";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { allowAgentRequest } from "@/lib/agent/rate-limit";
import { analyzeEmail } from "@/lib/agent/analyze";

const schema = z.object({ mailboxId: z.string().min(1), emailId: z.string().min(1), classify: z.boolean().default(false), draft: z.boolean().default(false), memoryRead: z.boolean().default(false), memoryWrite: z.boolean().default(false), markRead: z.boolean().default(false) });
export async function POST(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
	if (!hasValidSessionMutationOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
	if (!await allowAgentRequest(env, `analyze:${user.id}`)) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
	try { return Response.json(await analyzeEmail({ env, user, mailboxId: parsed.data.mailboxId, origin: "chat" }, parsed.data.emailId, parsed.data)); }
	catch (error) { console.error("Email analysis failed", error); return Response.json({ error: "Email analysis failed. Check mailbox permissions, provider settings, or Hindsight connection." }, { status: 400 }); }
}
