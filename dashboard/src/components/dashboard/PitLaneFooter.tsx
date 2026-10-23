"use client";

import clsx from "clsx";

import type { Driver } from "@/types/state.type";

import { useDataStore } from "@/stores/useDataStore";
import { sortPos } from "@/lib/sorting";

import DriverChip from "@/components/driver/DriverChip";

// Map footer (SPEC §3.3): the cars in the pit lane, the retired ones, and the followed legend.
export default function PitLaneFooter() {
	const drivers = useDataStore((s) => s.state?.DriverList);
	const timing = useDataStore((s) => s.state?.TimingData);

	const lines = timing ? Object.values(timing.Lines).sort(sortPos) : [];
	const chip = (nr: string) => drivers?.[nr];
	const inPit = lines.filter((l) => l.InPit && !l.Retired && !l.Stopped).map((l) => chip(l.RacingNumber));
	const retired = lines.filter((l) => l.Retired || l.Stopped).map((l) => chip(l.RacingNumber));

	return (
		<div className="flex flex-wrap items-center gap-2.5 border-t border-border px-3 py-2 text-xs text-fg-3">
			<span>Pit lane</span>
			<ChipList drivers={inPit} />
			{retired.length > 0 && (
				<>
					<ChipList drivers={retired} dim />
					<span>Retired</span>
				</>
			)}
			<span className="ml-auto flex items-center gap-1.5">
				<span aria-hidden className="size-3 rounded-full border-2 border-fg-1" />
				Followed driver
			</span>
		</div>
	);
}

function ChipList({ drivers, dim }: { drivers: (Driver | undefined)[]; dim?: boolean }) {
	return (
		<span className={clsx("flex flex-wrap gap-1", dim && "opacity-60")}>
			{drivers.map((d) => d && <DriverChip key={d.RacingNumber} short={d.Tla} teamColor={d.TeamColour} size="sm" />)}
		</span>
	);
}
