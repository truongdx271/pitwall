"use client";

import Link from "next/link";
import clsx from "clsx";

import type { Driver } from "@/types/state.type";

import { useDataStore } from "@/stores/useDataStore";
import { sortPos } from "@/lib/sorting";

import Map from "@/components/dashboard/Map";
import Panel from "@/components/ui/Panel";
import DriverChip from "@/components/driver/DriverChip";

// Track panel shared by the Live tab in every session (SPEC §3.3): compact map, then a
// footer with the cars in the pit lane and the retired ones.
export default function TrackPanel({ className }: { className?: string }) {
	const drivers = useDataStore((s) => s.state?.DriverList);
	const timing = useDataStore((s) => s.state?.TimingData);

	const lines = timing ? Object.values(timing.Lines).sort(sortPos) : [];
	const chip = (nr: string) => drivers?.[nr];
	const inPit = lines.filter((l) => l.InPit && !l.Retired && !l.Stopped).map((l) => chip(l.RacingNumber));
	const retired = lines.filter((l) => l.Retired || l.Stopped).map((l) => chip(l.RacingNumber));

	return (
		<Panel
			title="Track"
			className={className}
			header={
				<>
					<span className="text-xs text-fg-3">Positions estimated from mini-sectors</span>
					<Link
						href="/dashboard?tab=map"
						className="ml-auto flex h-[30px] items-center gap-1.5 rounded-md px-2 text-xs text-fg-2 transition-colors hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
					>
						Open map
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
						</svg>
					</Link>
				</>
			}
		>
			<div className="min-h-0 flex-1 px-3 pb-1.5">
				<Map compact />
			</div>

			<div className="flex flex-wrap items-center gap-2.5 border-t border-border px-3 py-2 text-xs text-fg-3">
				<span>Pit lane</span>
				<ChipList drivers={inPit} />
				{inPit.length === 0 && <span className="text-fg-3">—</span>}
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
		</Panel>
	);
}

function ChipList({ drivers, dim }: { drivers: (Driver | undefined)[]; dim?: boolean }) {
	return (
		<span className={clsx("flex flex-wrap gap-1", dim && "opacity-60")}>
			{drivers.map((d) => d && <DriverChip key={d.RacingNumber} short={d.Tla} teamColor={d.TeamColour} size="sm" />)}
		</span>
	);
}
