"use client";

import { Sparkles } from "lucide-react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Button } from "@/components/ui/button";
import { ATTACH_EMAIL_EVENT, type AttachedEmail } from "./email-context";

export function EmailAgentAction({ emailId, subject }: { emailId: string; subject?: string | null }) {
	const { selectedMailbox } = useSelectedMailbox();
	return <Button type="button" variant="ghost" size="sm" aria-label="Ask AI about this email" title="Ask AI about this email" disabled={!selectedMailbox} onClick={event => {
		event.preventDefault();
		event.stopPropagation();
		if (!selectedMailbox) return;
		window.dispatchEvent(new CustomEvent<AttachedEmail>(ATTACH_EMAIL_EVENT, { detail: { mailboxId: selectedMailbox.id, emailId, subject: subject || "Untitled email", requestId: crypto.randomUUID() } }));
	}}><Sparkles className="h-4 w-4" /><span className="sr-only">Ask AI</span></Button>;
}
