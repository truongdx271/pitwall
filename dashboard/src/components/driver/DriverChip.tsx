import clsx from "clsx";

import { textOn } from "@/lib/color";

type Props = {
	short: string;
	/** Hex without '#', from DriverList[n].TeamColour (after teamColours()). */
	teamColor: string | undefined;
	/** md: 44px for the tables; sm: 36px for footers and message rows. */
	size?: "md" | "sm";
	className?: string;
};

// The redesign's driver tag: TLA on the team colour, Geist 12/700. 44px wide so it sits
// in the tables' 48px DRIVER column (source/Main.dc.html).
export default function DriverChip({ short, teamColor, size = "md", className }: Props) {
	return (
		<span
			className={clsx(
				"inline-block shrink-0 rounded-tag text-center font-sans font-bold tracking-[0.02em]",
				size === "md" ? "w-11 py-0.5 text-xs leading-4" : "w-9 py-px text-[11px] leading-[14px]",
				!teamColor && "bg-surface-3 text-fg-2",
				className,
			)}
			style={teamColor ? { backgroundColor: `#${teamColor}`, color: textOn(teamColor) } : undefined}
		>
			{short}
		</span>
	);
}
