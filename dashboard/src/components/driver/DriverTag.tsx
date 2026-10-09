import { textOn } from "@/lib/color";

type Props = {
	teamColor: string;
	short: string;
	position?: number;
	className?: string;
};

export default function DriverTag({ position, teamColor, short, className }: Props) {
	const bg = teamColor ? `#${teamColor}` : "#444";
	const fg = textOn(teamColor);

	return (
		<span className={`flex items-baseline gap-[0.5ch] overflow-hidden ${className ?? ""}`}>
			{position !== undefined && (
				<span className="w-[2ch] shrink-0 text-right text-zinc-600 tabular-nums">{position}</span>
			)}
			<span className="shrink-0 px-[0.3ch] leading-none font-bold" style={{ backgroundColor: bg, color: fg }}>
				{short}
			</span>
		</span>
	);
}
