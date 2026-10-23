"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sessionKind } from "@/lib/sessionKind";
import { sessionPartPrefix } from "@/lib/sessionPart";

import Map from "@/components/dashboard/Map";
import PitLaneFooter from "@/components/dashboard/PitLaneFooter";
import Panel from "@/components/ui/Panel";
import MapOrderList from "@/components/map/MapOrderList";
import PushLapPanel from "@/components/map/PushLapPanel";
import LongRunsPanel from "@/components/map/LongRunsPanel";

// Map tab (SPEC §6): order list, the full map, and a session-specific side panel
// (none in the race).
export default function TrackMap() {
	const session = useDataStore((s) => s.state?.SessionInfo);
	const part = useDataStore((s) => s.state?.TimingData?.SessionPart);
	const kind = sessionKind(session);

	const title =
		kind === "qualifying"
			? `${part ? `${sessionPartPrefix(session?.Name ?? "") || "Q"}${part}` : "Qualifying"} order`
			: kind === "practice"
				? `${session?.Name?.replace(/^Practice\s*/i, "FP") ?? "Practice"} order`
				: "Race order";

	return (
		<div className="flex h-full flex-wrap items-stretch gap-3 p-3 xl:flex-nowrap">
			<div className="flex min-w-0 flex-[1_1_320px] flex-col xl:max-w-[320px]">
				<MapOrderList kind={kind} title={title} />
			</div>

			<div className="flex min-h-[420px] min-w-0 flex-[999_1_520px] flex-col">
				<MapPanel name={session?.Meeting.Circuit.ShortName} />
			</div>

			{kind !== "race" && (
				<div className="flex min-w-0 flex-[1_1_360px] flex-col xl:max-w-[400px]">
					{kind === "qualifying" ? <PushLapPanel /> : <LongRunsPanel />}
				</div>
			)}
		</div>
	);
}

function MapPanel({ name }: { name: string | undefined }) {
	const showCornerNumbers = useSettingsStore((s) => s.showCornerNumbers);
	const setShowCornerNumbers = useSettingsStore((s) => s.setShowCornerNumbers);

	return (
		<Panel
			title={name ?? "Circuit"}
			className="h-full"
			header={
				<>
					<span className="text-xs text-fg-3">Estimated from mini-sectors</span>
					<label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-fg-2">
						<input
							type="checkbox"
							checked={showCornerNumbers}
							onChange={(e) => setShowCornerNumbers(e.target.checked)}
							className="size-4 accent-fg-1"
						/>
						Corner numbers
					</label>
				</>
			}
		>
			<div className="min-h-0 flex-1 border-t border-border p-3">
				<Map />
			</div>
			<PitLaneFooter />
		</Panel>
	);
}
