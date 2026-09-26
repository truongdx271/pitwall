import clsx from "clsx";

import type { Stint } from "@/types/state.type";

import { stintLaps } from "@/lib/tyreStrategy";

type Props = {
	stints: Stint[] | undefined;
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

// Most recent stints, oldest -> newest; earlier ones dimmed.
export default function DriverTireStack({ stints, max = 3 }: Props) {
	const recent = (stints ?? []).slice(-max);

	if (recent.length === 0) return <span className="text-zinc-800">---</span>;

	return (
		<span className="flex items-baseline gap-[0.5ch] whitespace-nowrap tabular-nums">
			{recent.map((stint, i) => {
				const compound = stint.Compound?.toLowerCase() ?? "";
				const known = compound in COMPOUND_LETTER;
				const current = i === recent.length - 1;

				return (
					<span
						key={i}
						className={clsx(
							"inline-block min-w-[4ch] px-[0.3ch] leading-none font-bold",
							known ? COMPOUND_BG[compound] : "bg-zinc-700 text-black",
							!current && "opacity-40",
						)}
					>
						{known ? COMPOUND_LETTER[compound] : "?"} {stintLaps(stint)}
					</span>
				);
			})}
		</span>
	);
}
