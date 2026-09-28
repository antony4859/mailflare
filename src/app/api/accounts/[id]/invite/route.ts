import { z } from "zod";
import { requireTeamAdmin } from "../../utils";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { readJsonBody } from "@/lib/http/request";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { sendTeamInvitation } from "@/lib/auth/team-invitation";
import type { AccountRouteParams } from "../types";

export async function POST(request: Request, { params }: AccountRouteParams) {
	const access = await requireTeamAdmin(request);
	if (access.error) return access.error;
	if (!hasValidSessionMutationOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
	if (!await allowLoginAttempt(access.env, request)) return Response.json({ error: "Try again shortly" }, { status: 429 });
	const input = z.object({ recipient: z.string().trim().email().max(320).transform(value => value.toLowerCase()) }).safeParse(await readJsonBody(request, 4096).catch(() => null));
	if (!input.success) return Response.json({ error: "Enter the teammate’s existing email address" }, { status: 400 });
	try {
		return Response.json(await sendTeamInvitation(access.env, access.user!.id, (await params).id, input.data.recipient), { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : "Invitation failed" }, { status: 400 });
	}
}
