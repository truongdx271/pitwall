import clsx from "clsx";

import { usePositionFlash } from "@/hooks/usePositionFlash";

type Props = {
	position: number;
	// Retired / stopped cars drop down the order without being overtaken: no arrow.
	out?: boolean;
	className?: string;
};

// The P column: a green ▲ / red ▼ for 2 s after an overtake, then the number again.
export default function PositionCell({ position, out, className }: Props) {
	const move = usePositionFlash(position);

	if (move && !out) {
		return (
			<span
				className={clsx("text-right font-sans text-xs font-semibold", move === "up" ? "text-gain" : "text-loss")}
				aria-label={`P${position}, ${move === "up" ? "gained" : "lost"} a place`}
			>
				{move === "up" ? "▲" : "▼"}
			</span>
		);
	}

	return <span className={clsx("text-right", className)}>{position}</span>;
}
