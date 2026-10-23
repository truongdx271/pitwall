import clsx from "clsx";

import type { Stint } from "@/types/state.type";

import { stintLaps } from "@/lib/tyreStrategy";
import { getStintBoundaries, stintAvgMs, formatMs, type StintBoundary } from "@/lib/stints";
import { slopeMsPerLap, validStintLaps } from "@/lib/longRun";
import { useHistoryStore, type LapTimeEntry } from "@/stores/useHistoryStore";

type Props = {
	stints: Stint[] | undefined;
	racingNumber: string;
	showPace?: boolean;
	/**
	 * Practice pace: average and degradation over the stint's valid laps (107% of bestMs).
	 * Without it (race) the pace view shows the push-lap average only (SPEC §3.2, §5).
	 */
	practiceBestMs?: number;
	max?: number;
};

const COMPOUND_LETTER: Record<string, string> = {
	soft: "S",
	medium: "M",
	hard: "H",
	intermediate: "I",
	wet: "W",
};

const COMPOUND_BG: Record<string, string> = {
	soft: "bg-tyre-soft text-bg",
	medium: "bg-tyre-medium text-bg",
	hard: "bg-tyre-hard text-bg",
	intermediate: "bg-tyre-inter text-bg",
	wet: "bg-tyre-wet text-bg",
};

const EMPTY_ENTRIES: LapTimeEntry[] = [];

// Most recent stints, newest (current) on the left; earlier ones dimmed.
// With showPace, each stint box is followed by its push-lap average and degradation.
export default function DriverTireStack({ stints, racingNumber, showPace = false, practiceBestMs, max = 3 }: Props) {
	const entries = useHistoryStore((s) => (showPace ? (s.lapTimes[racingNumber] ?? EMPTY_ENTRIES) : EMPTY_ENTRIES));

	const all = stints ?? [];
	const offset = Math.max(0, all.length - max);
	const recent = all.slice(offset);

	if (recent.length === 0) return <span className="text-fg-3">—</span>;

	// getStintBoundaries skips stints without laps, so map each stint index to its boundary.
	const boundaries = showPace ? getStintBoundaries(all) : [];
	const boundaryOf: (StintBoundary | undefined)[] = [];
	let b = 0;
	for (const s of all) boundaryOf.push(s.TotalLaps != null && s.TotalLaps > 0 ? boundaries[b++] : undefined);

	return (
		<span
			className={clsx(
				"flex min-w-0 items-center font-mono whitespace-nowrap tabular-nums",
				// Three stints with their pace can be wider than the column; clip rather than spill.
				showPace ? "gap-3 overflow-hidden" : "gap-1",
			)}
		>
			{recent
				.map((_, j) => recent.length - 1 - j)
				.map((i) => {
					const stint = recent[i];
					const compound = stint.Compound?.toLowerCase() ?? "";
					const known = compound in COMPOUND_LETTER;
					const current = i === recent.length - 1;
					const boundary = boundaryOf[offset + i];

					return (
						<span key={i} className="flex items-center gap-1.5">
							<span
								className={clsx(
									"inline-block min-w-9 rounded-tag px-[5px] py-0.5 text-center text-xs leading-[14px] font-bold",
									known ? COMPOUND_BG[compound] : "bg-surface-3 text-fg-2",
									!current && "opacity-40",
								)}
							>
								{known ? COMPOUND_LETTER[compound] : "?"} {stintLaps(stint)}
							</span>
							{showPace && (
								<StintPace
									entries={entries}
									boundary={boundary}
									boundaries={boundaries}
									current={current}
									practiceBestMs={practiceBestMs}
								/>
							)}
						</span>
					);
				})}
		</span>
	);
}

type StintPaceProps = {
	entries: LapTimeEntry[];
	boundary: StintBoundary | undefined;
	boundaries: StintBoundary[];
	current: boolean;
	practiceBestMs: number | undefined;
};

function StintPace({ entries, boundary, boundaries, current, practiceBestMs }: StintPaceProps) {
	let avg: number | null = null;
	let deg: number | null = null;

	if (boundary && practiceBestMs != null) {
		const valid = validStintLaps(entries, boundary, boundaries, practiceBestMs);
		if (valid.length >= 2) avg = valid.reduce((sum, l) => sum + l.ms, 0) / valid.length;
		deg = valid.length >= 3 ? slopeMsPerLap(valid) : null;
	} else if (boundary) {
		avg = stintAvgMs(entries, boundary, boundaries);
	}

	if (avg == null) return <span className="text-xs text-fg-3">—</span>;

	return (
		<span className="flex items-baseline gap-1">
			<span className={clsx("text-xs", current ? "text-fg-1" : "text-fg-2")}>{formatMs(avg)}</span>
			{deg != null && (
				<span className={clsx("text-[11px]", deg > 150 ? "text-loss" : "text-fg-3")}>
					{deg > 0 ? "+" : ""}
					{(deg / 1000).toFixed(2)}
				</span>
			)}
		</span>
	);
}
