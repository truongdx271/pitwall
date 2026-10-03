import clsx from "clsx";

import type { Stint } from "@/types/state.type";

type Props = {
	stints: Stint[] | undefined;
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

export default function DriverTire({ stints }: Props) {
	const stops = Math.max(0, (stints?.length ?? 0) - 1);
	const currentStint = stints ? stints[stints.length - 1] : null;
	const compound = currentStint?.Compound?.toLowerCase() ?? "";
	const known = compound in COMPOUND_LETTER;
	const letter = known ? COMPOUND_LETTER[compound] : "?";
	const bg = known ? COMPOUND_BG[compound] : "bg-zinc-700 text-black";
	const laps = currentStint?.TotalLaps ?? 0;

	return (
		<span className="flex items-baseline gap-[0.5ch] whitespace-nowrap tabular-nums">
			<span className={clsx("px-[0.3ch] leading-none font-bold", bg)}>
				{letter} {laps}
			</span>
			<span className="text-zinc-700">p{stops}</span>
		</span>
	);
}
