import clsx from "clsx";

import { textOn } from "@/lib/color";

type Props = {
	short: string;
	/** Hex without '#', from DriverList[n].TeamColour (after teamColours()). */
	teamColor: string | undefined;
	className?: string;
};

// The redesign's driver tag: TLA on the team colour, Geist 12/700. 44px wide so it sits
// in the tables' 48px DRIVER column (source/Main.dc.html).
export default function DriverChip({ short, teamColor, className }: Props) {
	return (
		<span
			className={clsx(
				"inline-block w-11 shrink-0 rounded-tag py-0.5 text-center font-sans text-xs leading-4 font-bold tracking-[0.02em]",
				!teamColor && "bg-surface-3 text-fg-2",
				className,
			)}
			style={teamColor ? { backgroundColor: `#${teamColor}`, color: textOn(teamColor) } : undefined}
		>
			{short}
		</span>
	);
}
