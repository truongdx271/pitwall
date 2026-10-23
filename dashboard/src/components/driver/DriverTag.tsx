import DriverChip from "./DriverChip";

type Props = {
	teamColor: string;
	short: string;
	position?: number;
	className?: string;
};

export default function DriverTag({ position, teamColor, short, className }: Props) {
	return (
		<span className={`flex items-center gap-1.5 overflow-hidden ${className ?? ""}`}>
			{position !== undefined && <span className="w-[2ch] shrink-0 text-right text-fg-3 tabular-nums">{position}</span>}
			<DriverChip short={short} teamColor={teamColor} />
		</span>
	);
}
