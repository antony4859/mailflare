"use client";

import { useEffect, useRef, useState } from "react";
import { Reply, ChevronDown } from "lucide-react";
import { ComposeForm } from "@/components/compose/compose-form";
import { INLINE_REPLY_EVENT, type InlineReplyRequest } from "@/components/compose/inline-reply";
import type { ThreadDraft } from "@/hooks/types";

export function ThreadReplyComposer({ messageId, messageIds, drafts }: { messageId: string; messageIds: string[]; drafts: ThreadDraft[] }) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [collapsed, setCollapsed] = useState(false);
	const container = useRef<HTMLElement | null>(null);
	useEffect(() => {
		function open(event: Event) {
			const request = event as CustomEvent<InlineReplyRequest>;
			if (request.detail.sourceMessageId !== messageId && !messageIds.includes(request.detail.sourceMessageId)) return;
			const draftId = request.detail.draftId || activeId || drafts.at(-1)?.id;
			if (!draftId) return;
			request.preventDefault();
			setActiveId(draftId);
			setCollapsed(false);
			window.dispatchEvent(new Event("mailflare:messages-changed"));
		}
		window.addEventListener(INLINE_REPLY_EVENT, open);
		return () => window.removeEventListener(INLINE_REPLY_EVENT, open);
	}, [messageId, messageIds, drafts, activeId]);
	useEffect(() => { if (activeId && !collapsed) container.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [activeId, collapsed]);
	if (!drafts.length && !activeId) return null;
	const visibleDrafts = activeId && !drafts.some(draft => draft.id === activeId) ? [...drafts, { id: activeId, subject: "Reply", snippet: "Continue your reply…" }] : drafts;
	return <section ref={container} aria-label="Reply drafts" className="mx-4 mb-6 space-y-3 sm:mx-6">
		{visibleDrafts.filter(draft => draft.id !== activeId || collapsed).map(draft => <button key={draft.id} type="button" className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-4 text-left hover:bg-neutral-50" onClick={() => { setActiveId(draft.id); setCollapsed(false); }}><Reply size={18} className="shrink-0 text-neutral-500" /><span className="min-w-0 flex-1"><span className="text-sm font-medium text-red-600">Draft</span><span className="ml-2 text-sm text-neutral-500">Reply</span><span className="mt-1 block truncate text-sm text-neutral-600">{draft.snippet || "Continue your reply…"}</span></span><ChevronDown size={16} className="text-neutral-400" /></button>)}
		{activeId && <div className={collapsed ? "hidden" : ""}><ComposeForm key={activeId} mode="inline" draftIdToLoad={activeId} onClose={() => { setActiveId(null); setCollapsed(false); window.dispatchEvent(new Event("mailflare:messages-changed")); }} onCollapse={() => setCollapsed(true)} /></div>}
	</section>;
}
