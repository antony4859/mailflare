"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TeamInvitation({ accountId, recoveryEmail }: { accountId: string; recoveryEmail?: string | null }) {
	const [recipient, setRecipient] = useState(recoveryEmail || "");
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState("");
	return <form className="space-y-3 rounded-3xl bg-white p-6" onSubmit={async event => {
		event.preventDefault(); setBusy(true); setResult("");
		try {
			const response = await authFetch(`/api/accounts/${encodeURIComponent(accountId)}/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient }) });
			const data = await response.json() as { error?: string; expiresAt?: string };
			if (!response.ok) throw new Error(data.error || "Could not send invitation");
			setResult(`Invitation sent. Link expires ${new Date(data.expiresAt!).toLocaleString()}.`);
		} catch (error) { setResult(error instanceof Error ? error.message : "Could not send invitation"); }
		finally { setBusy(false); }
	}}><h2 className="font-medium">Invite this teammate</h2><p className="text-sm text-neutral-500">Send a one-time password setup link to their existing email. It expires after 48 hours and replaces previous setup links. This address becomes their recovery email.</p><label className="block text-sm">Existing email<Input type="email" required value={recipient} disabled={busy} onChange={event => setRecipient(event.target.value)} /></label><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send 48-hour invitation"}</Button>{result && <p role="status" className="text-sm">{result}</p>}</form>;
}
