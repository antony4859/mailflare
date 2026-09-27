export type AttachedEmail = { mailboxId: string; emailId: string; subject: string; requestId: string };
export const ATTACH_EMAIL_EVENT = "mailflare:attach-email";

export function attachedEmailId(email: AttachedEmail | null, mailboxId: string) {
	return email?.mailboxId === mailboxId ? email.emailId : null;
}
