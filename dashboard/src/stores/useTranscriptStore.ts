import { create } from "zustand";

// Radio transcripts by clip key (session path + clip path). Survives remounts (tab switches,
// list reshuffles) so a clip is fetched once per page load, and lets the message lists count
// only the clips they will show.
type TranscriptStore = {
	texts: Record<string, string>;
	failed: Record<string, true>;
	setText: (key: string, text: string) => void;
	setFailed: (key: string) => void;
};

export const useTranscriptStore = create<TranscriptStore>()((set) => ({
	texts: {},
	failed: {},
	setText: (key, text) => set((s) => ({ texts: { ...s.texts, [key]: text } })),
	setFailed: (key) => set((s) => ({ failed: { ...s.failed, [key]: true } })),
}));
