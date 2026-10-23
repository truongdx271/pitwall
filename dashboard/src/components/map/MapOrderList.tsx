"use client";

import { Fragment } from "react";
import clsx from "clsx";

import type { Driver, TimingDataDriver } from "@/types/state.type";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sortPos } from "@/lib/sorting";
import { parseTimeMs } from "@/lib/timeUtils";
import { knockoutCutoff } from "@/lib/knockout";
import { positionDelta } from "@/lib/raceRow";
import type { SessionKind } from "@/lib/sessionKind";

import Panel from "@/components/ui/Panel";
import DriverChip from "@/components/driver/DriverChip";

// Column templates (SPEC §6.2–6.4).
const GRID: Record<SessionKind, string> = {
	race: "22px 48px 38px minmax(0, 1fr) 80px",
	qualifying: "22px 48px minmax(0, 1fr) 76px",
	practice: "22px 48px minmax(0, 1fr) 36px",
};

const HEADERS: Record<SessionKind, string[]> = {
	race: ["P", "DRIVER", "+/−", "GAP", "LAST"],
	qualifying: ["P", "DRIVER", "GAP", "BEST"],
	practice: ["P", "DRIVER", "BEST", "LAPS"],
};

type Props = {
	kind: SessionKind;
	title: string;
};

// Order list on the Map tab. Clicking a row follows (or unfollows) that driver.
export default function MapOrderList({ kind, title }: Props) {
	const drivers = useDataStore((s) => s.state?.DriverList);
	const timing = useDataStore((s) => s.state?.TimingData);
	const favorites = useSettingsStore((s) => s.favoriteDrivers);
	const setFavorites = useSettingsStore((s) => s.setFavoriteDrivers);

	const lines = timing ? Object.values(timing.Lines).sort(sortPos) : [];
	const cutoff = kind === "qualifying" ? knockoutCutoff(timing?.NoEntries, timing?.SessionPart) : null;

	let poleMs = Infinity;
	for (const l of lines) poleMs = Math.min(poleMs, parseTimeMs(l.BestLapTime?.Value ?? ""));

	const toggle = (nr: string) =>
		setFavorites(favorites.includes(nr) ? favorites.filter((d) => d !== nr) : [...favorites, nr]);

	return (
		<Panel
			title={title}
			className="flex-1 px-1.5 pb-2"
			header={<span className="ml-auto text-xs text-fg-3">Select to follow</span>}
		>
			<div
				className="grid h-[26px] items-center gap-x-1.5 border-b border-border px-2.5 text-[11px] font-medium tracking-[0.04em] text-fg-3"
				style={{ gridTemplateColumns: GRID[kind] }}
			>
				{HEADERS[kind].map((h, i) => (
					<span key={h} className={clsx(i === 0 || i >= 2 ? "text-right" : "")}>
						{h}
					</span>
				))}
			</div>

			<ul className="min-h-0 flex-1 overflow-y-auto pt-1">
				{drivers &&
					lines.map((line, index) => {
						const driver = drivers[line.RacingNumber];
						if (!driver) return null;
						const position = index + 1;
						const knockout = cutoff != null && position > cutoff;
						return (
							<Fragment key={line.RacingNumber}>
								{cutoff != null && position === cutoff + 1 && (
									<li role="separator" className="flex items-center gap-2.5 px-2.5 pt-1.5 pb-1">
										<span className="h-px flex-1 bg-loss/50" />
										<span className="text-[10px] font-semibold tracking-[0.05em] text-loss">KNOCKOUT</span>
										<span className="h-px flex-1 bg-loss/50" />
									</li>
								)}
								<li>
									<button
										type="button"
										aria-pressed={favorites.includes(line.RacingNumber)}
										onClick={() => toggle(line.RacingNumber)}
										className={clsx(
											"grid h-row w-full cursor-pointer items-center gap-x-1.5 rounded-md px-2.5 text-left font-mono text-[13px] tabular-nums focus-visible:outline-2 focus-visible:outline-fg-1",
											favorites.includes(line.RacingNumber) && "outline-1 outline-fg-1",
											knockout ? "bg-ko-row" : position % 2 === 0 && "bg-row-alt",
										)}
										style={{ gridTemplateColumns: GRID[kind] }}
									>
										<OrderRow
											kind={kind}
											position={position}
											knockout={knockout}
											driver={driver}
											line={line}
											poleMs={poleMs}
										/>
									</button>
								</li>
							</Fragment>
						);
					})}
			</ul>
		</Panel>
	);
}

type RowProps = {
	kind: SessionKind;
	position: number;
	knockout: boolean;
	driver: Driver;
	line: TimingDataDriver;
	poleMs: number;
};

function OrderRow({ kind, position, knockout, driver, line, poleMs }: RowProps) {
	const app = useDataStore((s) => s.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const hasFastest = useDataStore(
		(s) => s.state?.TimingStats?.Lines[driver.RacingNumber]?.PersonalBestLapTime?.Position === 1,
	);

	const bestMs = parseTimeMs(line.BestLapTime?.Value ?? "");
	const gapToPole = Number.isFinite(bestMs) && Number.isFinite(poleMs) ? bestMs - poleMs : null;
	const best = (
		<span className={clsx("text-right", hasFastest ? "text-session-best" : "text-fg-1")}>
			{line.BestLapTime?.Value || "—"}
		</span>
	);

	const cells = [
		<span key="p" className={clsx("text-right", knockout ? "text-loss" : "text-fg-2")}>
			{position}
		</span>,
		<DriverChip key="d" short={driver.Tla} teamColor={driver.TeamColour} />,
	];

	if (kind === "race") {
		const out = !!(line.Retired || line.Stopped);
		const delta = positionDelta(
			out ? undefined : app ? parseInt(app.GridPos) : undefined,
			parseInt(line.Position),
			hasFastest,
		);
		const gap = line.GapToLeader ?? "";
		const leader = line.Position === "1" || /^LAP \d/i.test(gap);
		cells.push(
			<span
				key="delta"
				className={clsx("text-right font-sans text-xs font-medium", {
					"text-session-best": delta.kind === "fl",
					"text-gain": delta.kind === "gain",
					"text-loss": delta.kind === "loss",
					"text-fg-3": delta.kind === "none",
				})}
			>
				{delta.kind === "fl"
					? "FL"
					: delta.kind === "gain"
						? `▲${delta.places}`
						: delta.kind === "loss"
							? `▼${delta.places}`
							: "—"}
			</span>,
			<span key="gap" className={clsx("text-right", leader || out ? "font-sans text-fg-3" : "text-fg-1")}>
				{out ? "RET" : leader ? "Leader" : gap || "—"}
			</span>,
			<span key="last" className="text-right text-fg-1">
				{line.LastLapTime?.Value || "—"}
			</span>,
		);
	} else if (kind === "qualifying") {
		cells.push(
			<span key="gap" className={clsx("text-right", gapToPole ? "text-fg-1" : "font-sans text-fg-3")}>
				{gapToPole == null ? "No time" : gapToPole <= 0 ? "Fastest" : `+${(gapToPole / 1000).toFixed(3)}`}
			</span>,
			<Fragment key="best">{best}</Fragment>,
		);
	} else {
		cells.push(
			<Fragment key="best">{best}</Fragment>,
			<span key="laps" className="text-right text-fg-2">
				{line.NumberOfLaps ?? 0}
			</span>,
		);
	}

	return <>{cells}</>;
}
