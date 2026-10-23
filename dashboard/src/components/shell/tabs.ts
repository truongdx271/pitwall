import type { IconName } from "./icons";

export type TabId = "live" | "map" | "messages" | "strategy" | "weather" | "standings";

export const TABS: { id: TabId; label: string; icon: IconName }[] = [
	{ id: "live", label: "Live", icon: "live" },
	{ id: "map", label: "Map", icon: "map" },
	{ id: "messages", label: "Messages", icon: "messages" },
	{ id: "strategy", label: "Strategy", icon: "strategy" },
	{ id: "weather", label: "Weather", icon: "weather" },
	{ id: "standings", label: "Standings", icon: "standings" },
];

export const DEFAULT_TAB: TabId = "live";

export const parseTab = (value: string | null | undefined): TabId =>
	TABS.some((tab) => tab.id === value) ? (value as TabId) : DEFAULT_TAB;

export const tabHref = (id: TabId) => (id === DEFAULT_TAB ? "/dashboard" : `/dashboard?tab=${id}`);
