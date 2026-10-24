"use client";

import Map from "@/components/dashboard/Map";
import Panel from "@/components/ui/Panel";

import PitLaneFooter from "./PitLaneFooter";
import TabLink from "@/components/shell/TabLink";

// Track panel shared by the Live tab in every session (SPEC §3.3): compact map, then a
// footer with the cars in the pit lane and the retired ones.
export default function TrackPanel({ className }: { className?: string }) {
	return (
		<Panel
			title="Track"
			className={className}
			header={
				<>
					<span className="text-xs text-fg-3">Positions estimated from mini-sectors</span>
					<TabLink
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
					</TabLink>
				</>
			}
		>
			<div className="min-h-0 flex-1 px-3 pb-1.5">
				<Map compact />
			</div>

			<PitLaneFooter />
		</Panel>
	);
}
