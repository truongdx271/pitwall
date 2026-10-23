"use client";

import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { latestSessionStatus, trackStatusView } from "@/lib/trackStatus";

import Icon from "./icons";
import { STATUS_PILL } from "./SessionStrip";

// Full-width banner under the session strip whenever the track isn't clear (SPEC §2.3).
// With safety car colours off, SC and VSC show a neutral banner.
export default function TrackStatusBanner() {
	const statusCode = useDataStore((s) => s.state?.TrackStatus?.Status);
	const sessionStatus = useDataStore((s) =>
		latestSessionStatus(s.state?.SessionData?.StatusSeries, s.state?.SessionStatus?.Status),
	);
	const lap = useDataStore((s) => s.state?.LapCount?.CurrentLap);
	const scColours = useSettingsStore((s) => s.useSafetyCarColors);

	const status = trackStatusView(statusCode, sessionStatus);
	if (!status?.banner) return null;

	const neutral = !scColours && (status.kind === "sc" || status.kind === "vsc");

	return (
		<div
			role="alert"
			className={clsx(
				"flex items-center gap-3 px-4 py-2.5 text-sm font-semibold",
				neutral ? "bg-surface-3 text-fg-1" : STATUS_PILL[status.kind],
			)}
		>
			<Icon name="warning" size={18} strokeWidth={2.2} />
			<span>{status.banner}</span>
			{lap != null && <span className="ml-auto font-mono font-medium tabular-nums">Lap {lap}</span>}
		</div>
	);
}
