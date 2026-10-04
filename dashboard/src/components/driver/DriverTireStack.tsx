import clsx from "clsx";

import type { Stint } from "@/types/state.type";

import { stintLaps } from "@/lib/tyreStrategy";
import { getStintBoundaries, stintAvgMs, stintDegradation, formatMs, type StintBoundary } from "@/lib/stints";
import { useHistoryStore, type LapTimeEntry } from "@/stores/useHistoryStore";

type Props = {
	stints: Stint[] | undefined;
	racingNumber: string;
	showPace?: boolean;
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
	soft: "bg-red-500 text-black",
	medium: "bg-yellow-300 text-black",
	hard: "bg-zinc-100 text-black",
	intermediate: "bg-green-500 text-black",
	wet: "bg-blue-500 text-black",
};

const EMPTY_ENTRIES: LapTimeEntry[] = [];

// Most recent stints, newest (current) on the left; earlier ones dimmed.
// With showPace, each stint box is followed by its push-lap average and degradation.
export default function DriverTireStack({ stints, racingNumber, showPace = false, max = 3 }: Props) {
	const entries = useHistoryStore((s) => (showPace ? (s.lapTimes[racingNumber] ?? EMPTY_ENTRIES) : EMPTY_ENTRIES));

	const all = stints ?? [];
	const offset = Math.max(0, all.length - max);
	const recent = all.slice(offset);

	if (recent.length === 0) return <span className="text-zinc-800">---</span>;

	// getStintBoundaries skips stints without laps, so map each stint index to its boundary.
	const boundaries = showPace ? getStintBoundaries(all) : [];
	const boundaryOf: (StintBoundary | undefined)[] = [];
	let b = 0;
	for (const s of all) boundaryOf.push(s.TotalLaps != null && s.TotalLaps > 0 ? boundaries[b++] : undefined);

	return (
		<span
			className={clsx("flex items-baseline whitespace-nowrap tabular-nums", showPace ? "gap-[1.5ch]" : "gap-[0.5ch]")}
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
						<span key={i} className="flex items-baseline gap-[0.5ch]">
							<span
								className={clsx(
									"inline-block min-w-[4ch] px-[0.3ch] leading-none font-bold",
									known ? COMPOUND_BG[compound] : "bg-zinc-700 text-black",
									!current && "opacity-40",
								)}
							>
								{known ? COMPOUND_LETTER[compound] : "?"} {stintLaps(stint)}
							</span>
							{showPace && (
								<StintPace entries={entries} boundary={boundary} boundaries={boundaries} current={current} />
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
};

function StintPace({ entries, boundary, boundaries, current }: StintPaceProps) {
	const avg = boundary ? stintAvgMs(entries, boundary, boundaries) : null;
	const deg = boundary ? stintDegradation(entries, boundary, boundaries) : null;

	if (avg == null) return <span className="text-[11px] text-zinc-700">—</span>;

	return (
		<span className="flex items-baseline gap-[0.4ch]">
			<span className={clsx("text-[11px]", current ? "text-zinc-300" : "text-zinc-500")}>{formatMs(avg)}</span>
			{deg != null && (
				<span
					className={clsx("text-[10px]", deg > 150 ? "text-red-500" : deg < -50 ? "text-emerald-500" : "text-zinc-600")}
				>
					{deg > 0 ? "+" : ""}
					{(deg / 1000).toFixed(2)}
				</span>
			)}
		</span>
	);
}
