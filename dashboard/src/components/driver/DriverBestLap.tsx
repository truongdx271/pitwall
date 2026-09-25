import clsx from "clsx";

import type { TimingDataDriver } from "@/types/state.type";

type Props = {
	best: TimingDataDriver["BestLapTime"];
	hasFastest: boolean;
};

export default function DriverBestLap({ best, hasFastest }: Props) {
	return (
		<span
			className={clsx("block w-full text-right tabular-nums", {
				"text-violet-400": hasFastest,
				"text-zinc-400": !hasFastest && !!best?.Value,
				"text-zinc-800": !best?.Value,
			})}
		>
			{best?.Value || "---"}
		</span>
	);
}
