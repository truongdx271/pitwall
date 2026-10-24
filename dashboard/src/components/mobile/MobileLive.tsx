"use client";

import { Fragment, useState, type ReactNode } from "react";
import clsx from "clsx";

import type { Driver, TimingDataDriver } from "@/types/state.type";

import { useDataStore } from "@/stores/useDataStore";
import { useHistoryStore, type LapTimeEntry } from "@/stores/useHistoryStore";
import { sortPos } from "@/lib/sorting";
import { parseTimeMs } from "@/lib/timeUtils";
import { positionDelta } from "@/lib/raceRow";
import { knockoutCutoff } from "@/lib/knockout";
import { driverStatus, DRIVER_STATUS_COLOR, DRIVER_STATUS_LABEL } from "@/lib/driverStatus";
import { getStintBoundaries } from "@/lib/stints";
import { longRun } from "@/lib/longRun";
import { utcMs } from "@/lib/utcMs";
import type { SessionKind } from "@/lib/sessionKind";

import DriverChip from "@/components/driver/DriverChip";
import DriverTireStack from "@/components/driver/DriverTireStack";
import DriverDetailModal from "@/components/driver/DriverDetailModal";
import SegmentedControls from "@/components/ui/SegmentedControls";
import LongRunsPanel from "@/components/map/LongRunsPanel";
import TabLink from "@/components/shell/TabLink";

// Mobile tables (SPEC §11): only the columns that fit 390px, 26px rows; tap a row for the
// full detail (sectors, stints).
const GRID: Record<SessionKind, string> = {
	race: "20px 40px 30px minmax(0, 1fr) 70px 62px",
	qualifying: "20px 40px minmax(0, 1fr) 70px 54px",
	practice: "20px 40px minmax(0, 1fr) 34px 44px 62px",
};

// Header columns that sit over right-aligned cells.
const RIGHT: Record<SessionKind, number[]> = {
	race: [0, 3, 4],
	qualifying: [0, 2, 3],
	practice: [0, 2, 3],
};

const NO_LAPS: LapTimeEntry[] = [];

export default function MobileLive({ kind }: { kind: SessionKind }) {
	const drivers = useDataStore((s) => s.state?.DriverList);
	const timing = useDataStore((s) => s.state?.TimingData);
	const [detail, setDetail] = useState<string | null>(null);
	const [showInterval, setShowInterval] = useState(false);
	const [practiceView, setPracticeView] = useState<"timing" | "runs">("timing");

	const lines = timing ? Object.values(timing.Lines).sort(sortPos) : [];
	const open = detail ? lines.find((l) => l.RacingNumber === detail) : undefined;

	return (
		<div className="flex flex-col gap-2 px-2 pt-2 pb-4">
			{open && drivers?.[open.RacingNumber] && (
				<DriverDetailModal
					driver={drivers[open.RacingNumber]}
					timingDriver={open}
					position={lines.indexOf(open) + 1}
					onClose={() => setDetail(null)}
				/>
			)}

			<div className="flex items-center gap-3 px-1">
				{kind === "race" && (
					<SegmentedControls
						selected={showInterval}
						onSelect={setShowInterval}
						options={[
							{ label: "Gap", value: false },
							{ label: "Interval", value: true },
						]}
					/>
				)}
				{kind === "practice" && (
					<SegmentedControls
						selected={practiceView}
						onSelect={setPracticeView}
						options={[
							{ label: "Timing", value: "timing" },
							{ label: "Long runs", value: "runs" },
						]}
					/>
				)}
				<span className="text-xs text-fg-3">Tap a row for sectors</span>
			</div>

			{kind === "qualifying" && <PushStrip />}

			{kind === "practice" && practiceView === "runs" ? (
				<LongRunsPanel />
			) : (
				<MobileTable kind={kind} lines={lines} drivers={drivers} showInterval={showInterval} onOpen={setDetail} />
			)}

			{kind === "race" && <LatestRaceControl />}
		</div>
	);
}

type TableProps = {
	kind: SessionKind;
	lines: TimingDataDriver[];
	drivers: Record<string, Driver> | undefined;
	showInterval: boolean;
	onOpen: (nr: string) => void;
};

function MobileTable({ kind, lines, drivers, showInterval, onOpen }: TableProps) {
	const timing = useDataStore((s) => s.state?.TimingData);
	const cutoff = kind === "qualifying" ? knockoutCutoff(timing?.NoEntries, timing?.SessionPart) : null;
	const headers: Record<SessionKind, string[]> = {
		race: ["P", "DRIVER", "+/−", showInterval ? "INT" : "GAP", "LAST", "TYRE"],
		qualifying: ["P", "DRIVER", "GAP", "BEST", "STATUS"],
		practice: ["P", "DRIVER", "BEST", "LAPS", "STATUS", "TYRE"],
	};

	let fastest = Infinity;
	for (const l of lines) fastest = Math.min(fastest, parseTimeMs(l.BestLapTime?.Value ?? ""));

	return (
		<div>
			<div
				className="grid h-[26px] items-center gap-x-1.5 px-2 text-[11px] font-medium tracking-[0.04em] text-fg-3"
				style={{ gridTemplateColumns: GRID[kind] }}
			>
				{headers[kind].map((h, i) => (
					<span key={h} className={clsx(RIGHT[kind].includes(i) && "text-right")}>
						{h}
					</span>
				))}
			</div>
			{lines.map((line, index) => {
				const driver = drivers?.[line.RacingNumber];
				if (!driver) return null;
				const position = index + 1;
				const knockout = cutoff != null && position > cutoff;
				return (
					<Fragment key={line.RacingNumber}>
						{cutoff != null && position === cutoff + 1 && (
							<div role="separator" className="flex items-center gap-2 px-2 py-1">
								<span className="h-px flex-1 bg-loss/50" />
								<span className="text-[10px] font-semibold tracking-[0.05em] text-loss">KNOCKOUT</span>
								<span className="h-px flex-1 bg-loss/50" />
							</div>
						)}
						<button
							type="button"
							onClick={() => onOpen(line.RacingNumber)}
							aria-label={`${driver.FullName}, details`}
							className={clsx(
								"grid h-[26px] w-full cursor-pointer items-center gap-x-1.5 rounded-md px-2 text-left font-mono text-[13px] tabular-nums",
								knockout ? "bg-ko-row" : index % 2 === 1 && "bg-row-alt-mobile",
								(line.Retired || line.Stopped) && "opacity-45",
							)}
							style={{ gridTemplateColumns: GRID[kind] }}
						>
							<span className={clsx("text-right", knockout ? "text-loss" : "text-fg-2")}>{position}</span>
							<DriverChip short={driver.Tla} teamColor={driver.TeamColour} size="sm" />
							<MobileCells kind={kind} line={line} showInterval={showInterval} fastest={fastest} />
						</button>
					</Fragment>
				);
			})}
		</div>
	);
}

function MobileCells({
	kind,
	line,
	showInterval,
	fastest,
}: {
	kind: SessionKind;
	line: TimingDataDriver;
	showInterval: boolean;
	fastest: number;
}): ReactNode {
	const app = useDataStore((s) => s.state?.TimingAppData?.Lines?.[line.RacingNumber]);
	const hasFastest = useDataStore(
		(s) => s.state?.TimingStats?.Lines?.[line.RacingNumber]?.PersonalBestLapTime?.Position === 1,
	);
	const laps = useHistoryStore((s) => (kind === "practice" ? (s.lapTimes[line.RacingNumber] ?? NO_LAPS) : NO_LAPS));
	const out = !!(line.Retired || line.Stopped);
	const bestMs = parseTimeMs(line.BestLapTime?.Value ?? "");
	const gapMs = Number.isFinite(bestMs) && Number.isFinite(fastest) ? bestMs - fastest : null;
	const best = (
		<span className={clsx("text-right", hasFastest ? "text-session-best" : "text-fg-1")}>
			{line.BestLapTime?.Value || "—"}
		</span>
	);

	if (kind === "race") {
		const delta = positionDelta(
			out ? undefined : app ? parseInt(app.GridPos) : undefined,
			parseInt(line.Position),
			hasFastest,
		);
		const gap = line.GapToLeader ?? "";
		const leader = line.Position === "1" || /^LAP \d/i.test(gap);
		const value = showInterval ? line.IntervalToPositionAhead?.Value : gap;
		const last = line.LastLapTime;
		return (
			<>
				<span
					className={clsx("font-sans text-[11px] font-medium", {
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
				</span>
				<span className={clsx("text-right", out || leader ? "font-sans text-fg-3" : "text-fg-1")}>
					{out ? "RET" : leader ? (showInterval ? "—" : "Leader") : value || "—"}
				</span>
				<span
					className={clsx("text-right", {
						"text-session-best": last?.OverallFastest,
						"text-personal-best": !last?.OverallFastest && last?.PersonalFastest,
						"text-slower": !last?.OverallFastest && !last?.PersonalFastest && !!last?.Value,
						"text-fg-3": !last?.Value,
					})}
				>
					{last?.Value || "—"}
				</span>
				<DriverTireStack stints={app?.Stints} racingNumber={line.RacingNumber} max={1} />
			</>
		);
	}

	if (kind === "qualifying") {
		const status = driverStatus(line);
		return (
			<>
				<span className={clsx("text-right", gapMs ? "text-fg-1" : "font-sans text-fg-3")}>
					{gapMs == null ? "No time" : gapMs <= 0 ? "Fastest" : `+${(gapMs / 1000).toFixed(3)}`}
				</span>
				{best}
				<span className={clsx("truncate font-sans text-[11px] font-medium", DRIVER_STATUS_COLOR[status])}>
					{DRIVER_STATUS_LABEL[status]}
				</span>
			</>
		);
	}

	const boundaries = getStintBoundaries(app?.Stints ?? []);
	const run = longRun(laps, boundaries[boundaries.length - 1], boundaries, bestMs);
	const status = driverStatus(line, { longRun: run != null });
	return (
		<>
			{best}
			<span className="text-right text-fg-2">{line.NumberOfLaps ?? 0}</span>
			<span className={clsx("truncate font-sans text-[11px] font-medium", DRIVER_STATUS_COLOR[status])}>
				{DRIVER_STATUS_LABEL[status]}
			</span>
			<DriverTireStack stints={app?.Stints} racingNumber={line.RacingNumber} max={1} />
		</>
	);
}

// Quali: "N on push laps · Cut-off 1:15.761", linking to the Map tab's push-lap panel.
function PushStrip() {
	const timing = useDataStore((s) => s.state?.TimingData);
	const lines = timing ? Object.values(timing.Lines).sort(sortPos) : [];
	const pushing = lines.filter((l) => driverStatus(l) === "push").length;
	const cutoff = knockoutCutoff(timing?.NoEntries, timing?.SessionPart);
	const ref = lines[(cutoff ?? 1) - 1];

	return (
		<TabLink
			href="/dashboard?tab=map"
			className="flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface-1 px-3 text-xs text-fg-2"
		>
			<span className="font-semibold text-personal-best">{pushing}</span> on push laps
			{ref?.BestLapTime?.Value && (
				<>
					<span className="text-fg-3">·</span>
					{cutoff ? "Cut-off" : "Pole"} <span className="font-mono text-fg-1">{ref.BestLapTime.Value}</span>
				</>
			)}
			<span className="ml-auto text-fg-3">Map ↗</span>
		</TabLink>
	);
}

// Race: the latest race control message under the table.
function LatestRaceControl() {
	const messages = useDataStore((s) => s.state?.RaceControlMessages?.Messages);
	const latest = [...(messages ?? [])]
		.filter((m) => (m.Flag ? m.Flag.toLowerCase() !== "blue" : true))
		.sort((a, b) => utcMs(b.Utc) - utcMs(a.Utc))[0];
	if (!latest) return null;

	return (
		<TabLink
			href="/dashboard?tab=messages"
			className="flex min-h-11 items-center gap-3 rounded-control border border-border bg-surface-1 px-3 py-2 text-[13px] text-fg-body"
		>
			<span aria-hidden className="text-slower">
				⚑
			</span>
			<span className="line-clamp-2 flex-1">{latest.Message}</span>
			{latest.Lap != null && <span className="font-mono text-xs text-fg-3">L{latest.Lap}</span>}
		</TabLink>
	);
}
