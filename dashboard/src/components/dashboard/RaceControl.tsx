import { AnimatePresence } from "motion/react";

import { useDataStore } from "@/stores/useDataStore";
import { useRaceControlChime } from "@/hooks/useRaceControlChime";

import { sortUtc } from "@/lib/sorting";

import { RaceControlMessage } from "@/components/dashboard/RaceControlMessage";

export default function RaceControl() {
	const messages = useDataStore((state) => state.state?.RaceControlMessages?.Messages);
	const gmtOffset = useDataStore((state) => state.state?.SessionInfo?.GmtOffset);

	useRaceControlChime(messages);

	return (
		<ul className="flex flex-col font-mono">
			{!messages &&
				new Array(7).fill("").map((_, index) => <SkeletonMessage key={`msg.loading.${index}`} index={index} />)}

			{messages && gmtOffset && (
				<AnimatePresence>
					{messages
						.sort(sortUtc)
						.filter((msg) => (msg.Flag ? msg.Flag.toLowerCase() !== "blue" : true))
						.map((msg, i) => (
							<RaceControlMessage key={`msg.${i}`} msg={msg} />
						))}
				</AnimatePresence>
			)}
		</ul>
	);
}

const SkeletonMessage = ({ index }: { index: number }) => {
	const long = index % 5 === 0;
	const mid = index % 3 === 0;
	return (
		<li className="flex items-baseline gap-[1ch] border-b border-border px-2 py-0.5 font-mono text-sm">
			<span className="inline-block h-3 w-14 animate-pulse rounded-sm bg-surface-2" />
			<span
				className="inline-block h-3 animate-pulse rounded-sm bg-surface-2"
				style={{ width: long ? "70%" : mid ? "50%" : "35%" }}
			/>
		</li>
	);
};
