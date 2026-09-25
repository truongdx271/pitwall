import { AnimatePresence } from "motion/react";

import { useDataStore } from "@/stores/useDataStore";

import { sortUtc } from "@/lib/sorting";

import RadioMessage from "@/components/dashboard/RadioMessage";

export default function TeamRadios() {
	const drivers = useDataStore((state) => state.state?.DriverList);
	const teamRadios = useDataStore((state) => state.state?.TeamRadio);
	const sessionPath = useDataStore((state) => state.state?.SessionInfo?.Path);
	const gmtOffset = useDataStore((state) => state.state?.SessionInfo?.GmtOffset);

	const basePath = `https://livetiming.formula1.com/static/${sessionPath}`;

	return (
		<ul className="flex max-w-2xl flex-col font-mono">
			{!teamRadios && new Array(6).fill("").map((_, index) => <SkeletonMessage key={`radio.loading.${index}`} />)}

			{teamRadios && gmtOffset && drivers && teamRadios.Captures && (
				<AnimatePresence>
					{teamRadios.Captures.sort(sortUtc)
						.slice(0, 20)
						.map((teamRadio, i) => (
							<RadioMessage
								key={`radio.${i}`}
								driver={drivers[teamRadio.RacingNumber]}
								capture={teamRadio}
								basePath={basePath}
							/>
						))}
				</AnimatePresence>
			)}
		</ul>
	);
}

const SkeletonMessage = () => (
	<li className="flex items-center gap-[1ch] border-b border-zinc-900 px-2 py-0.5 font-mono text-sm">
		<span className="inline-block h-3 w-14 animate-pulse rounded-sm bg-zinc-800" />
		<span className="inline-block h-3 w-8 animate-pulse rounded-sm bg-zinc-800" />
		<span className="inline-block h-3 w-4 animate-pulse rounded-sm bg-zinc-800" />
		<span className="inline-block h-3 w-40 animate-pulse rounded-sm bg-zinc-800" />
	</li>
);
