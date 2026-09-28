export const INLINE_REPLY_EVENT = "mailflare:inline-reply";
export type InlineReplyRequest = { draftId: string; sourceMessageId: string };

export function requestInlineReply(draftId: string, sourceMessageId: string) {
	return !window.dispatchEvent(new CustomEvent<InlineReplyRequest>(INLINE_REPLY_EVENT, { cancelable: true, detail: { draftId, sourceMessageId } }));
}
