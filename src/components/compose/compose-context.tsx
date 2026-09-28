"use client";

import { createContext, useContext, useRef, useState } from "react";
import { fetchDraft } from "./utils";
import { requestInlineReply } from "./inline-reply";
import type { ReactNode } from "react";

type ComposeContextValue = {
	open: boolean;
	draftId: string | null;
	openComposer: () => void;
	openDraftComposer: (draftId: string) => void;
	closeComposer: () => void;
};

const ComposeContext = createContext<ComposeContextValue | null>(null);

export function useCompose() {
	const ctx = useContext(ComposeContext);
	if (!ctx) throw new Error("useCompose must be used within ComposeProvider");
	return ctx;
}

export function ComposeProvider({ children }: { children: ReactNode }) {
	const opening = useRef(0);
	const [open, setOpen] = useState(false);
	const [draftId, setDraftId] = useState<string | null>(null);

	return (
		<ComposeContext.Provider
			value={{
				open,
				draftId,
				openComposer: () => {
					opening.current += 1;
					setDraftId(null);
					setOpen(true);
				},
				openDraftComposer: async (nextDraftId) => {
					const generation = ++opening.current;
					try {
						const draft = await fetchDraft(nextDraftId);
						if (generation !== opening.current) return;
						if (draft.agent?.sourceMessageId && requestInlineReply(nextDraftId, draft.agent.sourceMessageId)) return;
					} catch { if (generation !== opening.current) return; }
					if (generation !== opening.current) return;
					setDraftId(nextDraftId);
					setOpen(true);
				},
				closeComposer: () => {
					opening.current += 1;
					setOpen(false);
					setDraftId(null);
				},
			}}
		>
			{children}
		</ComposeContext.Provider>
	);
}
