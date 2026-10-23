import clsx from "clsx";

import type { TimingDataDriver } from "@/types/state.type";
import { useSettingsStore } from "@/stores/useSettingsStore";

type Props = {
	sectors: TimingDataDriver["Sectors"];
};

export default function DriverMiniSectors({ sectors = [] }: Props) {
	const showMiniSectors = useSettingsStore((state) => state.showMiniSectors);

	return (
		<span className="flex flex-wrap items-center gap-x-[2ch] gap-y-1">
			{sectors.map((sector, i) => {
				const value = sector.Value || sector.PreviousValue || "";

				return (
					<span key={`sector.${i}`} className="flex items-center gap-[0.5ch] whitespace-nowrap">
						{showMiniSectors && sector.Segments.length > 0 && (
							<span className="flex items-center gap-px">
								{sector.Segments.map((segment, j) => (
									<MiniSector status={segment.Status} key={`sector.mini.${j}`} />
								))}
							</span>
						)}
						<span
							className={clsx("tabular-nums", {
								"text-violet-400": sector.OverallFastest,
								"text-emerald-400": !sector.OverallFastest && sector.PersonalFastest,
								"text-zinc-300": !sector.OverallFastest && !sector.PersonalFastest && !!sector.Value,
								"text-zinc-500": !sector.Value && !!sector.PreviousValue,
								"text-zinc-800": !sector.Value && !sector.PreviousValue,
							})}
						>
							{value || "---"}
						</span>
					</span>
				);
			})}
		</span>
	);
}

function MiniSector({ status }: { status: number }) {
	return (
		<span
			className={clsx("leading-none", {
				"text-amber-400": status === 2048 || status === 2052,
				"text-emerald-400": status === 2049,
				"text-violet-400": status === 2051,
				"text-blue-400": status === 2064,
				"text-zinc-800": status === 0,
			})}
		>
			{status === 0 ? "▒" : "█"}
		</span>
	);
}
