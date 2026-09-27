"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AnalysisResult = { summary: string; category: string | null; draftId: string | null; memoryWarning: string | null };
export function EmailAgentAction({ emailId }: { emailId: string }) {
	const { selectedMailbox } = useSelectedMailbox();
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [classify, setClassify] = useState(false);
	const [draft, setDraft] = useState(false);
	const [memoryRead, setMemoryRead] = useState(false);
	const [memoryWrite, setMemoryWrite] = useState(false);
	const [result, setResult] = useState<AnalysisResult | null>(null);
	const [error, setError] = useState("");
	async function run() {
		if (!selectedMailbox) return;
		setBusy(true); setError(""); setResult(null);
		try {
			const response = await authFetch("/api/agent/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mailboxId: selectedMailbox.id, emailId, classify, draft, memoryRead, memoryWrite }) });
			const data = await response.json() as AnalysisResult & { error?: string };
			if (!response.ok) throw new Error(data.error || "Analysis failed");
			setResult(data);
		} catch (failure) { setError(failure instanceof Error ? failure.message : "Analysis failed"); }
		finally { setBusy(false); }
	}
	return <>
		<Button type="button" variant="ghost" size="sm" aria-label="Analyze email with AI" title="Analyze email with AI" onClick={event => { event.stopPropagation(); setOpen(true); }}><Sparkles className="h-4 w-4" /></Button>
		<Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (!value) setMemoryWrite(false); } }}>
			<DialogContent onClick={event => event.stopPropagation()}>
				<DialogHeader><DialogTitle>Email assistant</DialogTitle><DialogDescription>Summarize this email, optionally categorize it or prepare a reply. Your selected AI provider reads the email. Nothing is sent as an email.</DialogDescription></DialogHeader>
				<div className="space-y-3 text-sm">
					<label className="flex gap-2"><input type="checkbox" checked={classify} disabled={busy} onChange={event => setClassify(event.target.checked)} />Save a category</label>
					<label className="flex gap-2"><input type="checkbox" checked={draft} disabled={busy} onChange={event => setDraft(event.target.checked)} />Prepare a reply draft</label>
					<label className="flex gap-2"><input type="checkbox" checked={memoryRead} disabled={busy} onChange={event => setMemoryRead(event.target.checked)} />Read shared Hindsight context</label>
					<label className="flex gap-2"><input type="checkbox" checked={memoryWrite} disabled={busy} onChange={event => setMemoryWrite(event.target.checked)} />Share this email’s summary with the company brain</label>
					{memoryWrite && <p className="text-amber-800">The summary will become available to everyone using the shared company memory.</p>}
					<Button onClick={() => void run()} disabled={busy || !selectedMailbox}>{busy ? "Working…" : "Read and summarize"}</Button>
					{error && <p role="alert" className="text-red-700">{error}</p>}
					{result && <div className="max-h-72 space-y-2 overflow-auto rounded-xl bg-neutral-50 p-3"><p className="whitespace-pre-wrap">{result.summary}</p>{result.category && <p>Category: {result.category.replaceAll("_", " ")}</p>}{result.draftId && <a className="text-blue-700 underline" href={`/drafts/${result.draftId}`}>Review draft</a>}{result.memoryWarning && <p role="alert">{result.memoryWarning}</p>}</div>}
				</div>
			</DialogContent>
		</Dialog>
	</>;
}
