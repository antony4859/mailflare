import type { AgentProviderPreset } from "./provider-types";

export const AGENT_SETTINGS_ID = "default";
export const DEFAULT_CLOUDFLARE_MODEL = "@cf/moonshotai/kimi-k2.5";
export const PROVIDER_BASE_URLS: Record<Exclude<AgentProviderPreset, "custom">, string> = {
	"opencode-go": "https://opencode.ai/zen/go/v1",
	openai: "https://api.openai.com/v1",
	openrouter: "https://openrouter.ai/api/v1",
	groq: "https://api.groq.com/openai/v1",
};

export const OPENCODE_CHAT_MODELS = [
	"mimo-v2.6-flash", "mimo-v2.6-pro", "mimo-v2.5", "mimo-v2.5-pro",
	"deepseek-v4.1-flash", "deepseek-v4-pro", "deepseek-v4-flash", "deepseek-v4-flash-vision-exp",
	"glm-5.3-flash", "glm-5.3", "glm-5.2", "glm-5.1",
	"kimi-k3", "kimi-k2.7-code", "kimi-k2.6", "longcat-2.0", "hy4-preview", "hy3",
	"space-bunny-free", "longcat-2.5-preview-free",
];
