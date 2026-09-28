import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { newId } from "@/lib/ids";
import { hashSessionToken } from "./session";
import { escapeHtml } from "./password-reset-utils";
import { sendSystemEmail } from "@/lib/email/system-mail";
import { createAuditLog } from "@/lib/mailboxes/audit";

export async function sendTeamInvitation(env: CloudflareEnv, adminId: string, userId: string, recipient: string) {
	const db = getDb(env);
	const [admin] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
	const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (!admin || admin.role !== "admin" || admin.disabled || !account || account.disabled || account.createdByUserId !== adminId || account.id === adminId) throw new Error("Account not found");
	const origin = new URL(env.APP_URL || "");
	if (origin.protocol !== "https:" || origin.username || origin.password) throw new Error("Configure a secure app URL first");
	const token = newId("invite");
	const id = newId("prt");
	const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
	await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
	await db.insert(passwordResetTokens).values({ id, userId, tokenHash: await hashSessionToken(token), expiresAt });
	const link = `${origin.origin}/reset-password?token=${encodeURIComponent(token)}`;
	try {
		const sent = await sendSystemEmail(env, {
			to: recipient,
			subject: `Your Zimo email is ready: ${account.email}`,
			text: `Hi ${account.name},\n\nAntony has set up your Zimo email: ${account.email}\n\nChoose your password using this one-time link. It expires in 48 hours (${expiresAt.toISOString()}):\n${link}\n\nThen sign in at ${origin.origin}/login with ${account.email}.\n\nYour inbox is private. The AI assistant is available; automatic processing and shared-memory writing are off by default.\n\nThis address (${recipient}) will be your password recovery address. If the link expires, ask Antony to send a new invitation.\n\nWelcome!`,
			html: `<p>Hi ${escapeHtml(account.name)},</p><p>Your Zimo email is ready: <b>${escapeHtml(account.email)}</b>.</p><p><a href="${escapeHtml(link)}">Choose your password</a></p><p>This one-time link expires in 48 hours (${expiresAt.toISOString()}).</p><p>Then sign in at <a href="${origin.origin}/login">Zimo Mail</a> with ${escapeHtml(account.email)}.</p><p>Your inbox is private. The AI assistant is available; automatic processing and shared-memory writing are off by default.</p><p>${escapeHtml(recipient)} will be your password recovery address. Ask Antony for a new invitation if this link expires.</p>`,
		});
		if (!sent) throw new Error("No sending domain configured");
	} catch {
		await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
		throw new Error("Invitation could not be sent");
	}
	await db.update(users).set({ resetEmail: recipient }).where(eq(users.id, userId));
	await createAuditLog(env, { actorUserId: adminId, targetUserId: userId, action: "account.invitation_sent", metadata: { recipient, expiresAt: expiresAt.toISOString() } });
	return { ok: true, email: account.email, recipient, expiresAt: expiresAt.toISOString() };
}
