"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, PauseCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentSettings } from "./types";

type Props = {
	settings: AgentSettings;
	onChange: (settings: AgentSettings) => void;
	onSave: () => Promise<boolean | undefined>;
	canManage: boolean;
	hindsightConnected: boolean;
	autoReplyEnabled: boolean;
	busy: boolean;
	reviewers: { id: string; name: string; email: string }[];
	models: string[];
};

export function AutomationSetup({ settings, onChange, onSave, canManage, hindsightConnected, autoReplyEnabled, busy, reviewers, models }: Props) {
	const [step, setStep] = useState(0);
	const [saved, setSaved] = useState(false);
	const disabled = !canManage || busy;
	const actions = [
		{ key: "autoAnalyzeEnabled", label: "Summarize", detail: "Save the important points beside each email." },
		{ key: "autoClassifyEnabled", label: "Categorize", detail: "Label finance, meetings, action items and more." },
		{ key: "autoDraftEnabled", label: "Draft a reply", detail: "Prepare a reply for a person to review and send." },
	] as const;
	const enabled = actions.filter(action => settings[action.key]);
	function change(patch: Partial<AgentSettings>) { setSaved(false); onChange({ ...settings, ...patch }); }
	return <div className="space-y-4">
		<div className="rounded-2xl bg-blue-50 p-4"><div className="flex items-center gap-2 font-medium text-blue-950"><Zap size={17} />When new mail arrives</div><p className="mt-1 text-xs text-blue-800">For this mailbox. Drafts always wait for your review.</p></div>
		<nav aria-label="Automation setup" className="flex gap-2">{["Task", "Memory", "Review"].map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined} className={`flex-1 rounded-lg py-2 text-xs ${step === index ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{index + 1}. {label}</button>)}</nav>
		{step === 0 && <fieldset className="space-y-2" disabled={disabled}><legend className="mb-3 text-base font-medium">What should happen automatically?</legend>{actions.map(action => <label key={action.key} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${settings[action.key] ? "border-blue-300 bg-blue-50" : "border-neutral-200"}`}><input type="checkbox" className="mt-1" checked={settings[action.key]} disabled={action.key === "autoDraftEnabled" && autoReplyEnabled} onChange={event => change({ [action.key]: event.target.checked })} /><span><span className="block font-medium">{action.label}</span><span className="block text-xs text-neutral-500">{action.detail}</span></span></label>)}{autoReplyEnabled && <p className="text-xs text-amber-800">Turn off out-of-office replies before enabling AI drafts.</p>}<p className="pt-2 text-xs text-neutral-500">Leave all tasks unchecked to pause automation.</p></fieldset>}
		{step === 1 && <fieldset className="space-y-3" disabled={disabled}><legend className="mb-3 text-base font-medium">Use the company brain?</legend><label className="flex gap-3 rounded-xl border border-neutral-200 p-3"><input type="checkbox" className="mt-1" checked={settings.autoHindsightReadEnabled} disabled={!hindsightConnected} onChange={event => change({ autoHindsightReadEnabled: event.target.checked })} /><span><span className="block font-medium">Read company context</span><span className="block text-xs text-neutral-500">Use shared knowledge without sending the email to Hindsight.</span></span></label><label className={`flex gap-3 rounded-xl border p-3 ${settings.autoHindsightWriteEnabled ? "border-amber-300 bg-amber-50" : "border-neutral-200"}`}><input type="checkbox" className="mt-1" checked={settings.autoHindsightWriteEnabled} disabled={!hindsightConnected} onChange={event => change({ autoHindsightWriteEnabled: event.target.checked })} /><span><span className="block font-medium">Share email summaries</span><span className="block text-xs text-neutral-500">Opt in only if this mailbox’s processed summaries should be available to the whole team.</span></span></label>{!hindsightConnected && <p className="text-xs text-neutral-500">Hindsight is not connected yet. You can use the assistant without it.</p>}<p className="text-xs text-neutral-500">The selected AI provider processes the emails. Shared-memory storage is a separate choice.</p></fieldset>}
		{step === 2 && <div className="space-y-3"><h3 className="text-base font-medium">Review your automation</h3><dl className="space-y-3 rounded-xl bg-neutral-50 p-4"><div><dt className="text-xs text-neutral-500">Trigger</dt><dd>New incoming email</dd></div><div><dt className="text-xs text-neutral-500">Tasks</dt><dd>{enabled.length ? enabled.map(action => action.label).join(" · ") : "Paused — no automatic processing"}</dd></div><div><dt className="text-xs text-neutral-500">Shared memory</dt><dd>{settings.autoHindsightReadEnabled ? "Read company context" : "No memory reads"} · {settings.autoHindsightWriteEnabled ? "Share summaries with the team" : "No memory writes"}</dd></div><div><dt className="text-xs text-neutral-500">Daily limit</dt><dd>{settings.dailyLimit} emails</dd></div></dl>{settings.autoHindsightWriteEnabled && enabled.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Saving will allow summaries of future processed emails in this mailbox to enter the shared company brain.</p>}<Button type="button" className="w-full" disabled={disabled} onClick={async () => { if (await onSave()) setSaved(true); }}>{busy ? "Saving…" : saved ? <><Check size={16} />Saved</> : enabled.length ? "Save automation" : <><PauseCircle size={16} />Save as paused</>}</Button>{saved && <p role="status" className="text-xs text-green-700">Saved for this mailbox.</p>}</div>}
		<details className="rounded-xl border border-neutral-200 p-3"><summary className="cursor-pointer text-xs font-medium">More options</summary><div className="mt-3 space-y-3">
			<label className="block text-xs">Model<select className="mt-1 w-full rounded-lg border p-2" value={settings.modelId ?? ""} disabled={disabled} onChange={event => change({ modelId: event.target.value })}>{models.map(model => <option key={model}>{model}</option>)}</select></label>
			<label className="block text-xs">Draft reviewer<select className="mt-1 w-full rounded-lg border p-2" value={settings.reviewerUserId ?? ""} disabled={disabled} onChange={event => change({ reviewerUserId: event.target.value })}>{reviewers.map(reviewer => <option key={reviewer.id} value={reviewer.id}>{reviewer.name || reviewer.email}</option>)}</select></label>
			<label className="block text-xs">Writing instructions<textarea className="mt-1 min-h-20 w-full rounded-lg border p-2" value={settings.instructions} disabled={disabled} maxLength={4000} onChange={event => change({ instructions: event.target.value })} /></label>
			<label className="block text-xs">Daily email limit<input type="number" min={1} max={100} className="mt-1 w-full rounded-lg border p-2" value={settings.dailyLimit} disabled={disabled} onChange={event => change({ dailyLimit: Number(event.target.value) })} /></label>
			<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.autoMarkReadEnabled} disabled={disabled} onChange={event => change({ autoMarkReadEnabled: event.target.checked })} />Mark processed emails as read</label>
		</div></details>
		<div className="flex justify-between"><Button type="button" variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={14} />Back</Button>{step < 2 && <Button type="button" size="sm" onClick={() => setStep(step + 1)}>Next<ArrowRight size={14} /></Button>}</div>
	</div>;
}
