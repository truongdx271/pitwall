import { utc } from "moment";

import type { Driver, RadioCapture } from "@/types/state.type";
import { useDataStore } from "@/stores/useDataStore";
import { useRadioTranscript } from "@/hooks/useRadioTranscript";
import { sortUtc } from "@/lib/sorting";

import DriverTag from "@/components/driver/DriverTag";

const MAX_CLIPS = 20;

export default function RadioTranscripts() {
	const drivers = useDataStore((state) => state.state?.DriverList);
	const captures = useDataStore((state) => state.state?.TeamRadio?.Captures);
	const sessionPath = useDataStore((state) => state.state?.SessionInfo?.Path);

	const latest = captures ? [...captures].sort(sortUtc).slice(0, MAX_CLIPS) : [];

	return (
		<div className="flex h-full flex-col font-mono">
			<div className="flex items-baseline justify-between border-b border-zinc-900 px-2 pb-1">
				<span className="text-[11px] tracking-widest text-zinc-400 uppercase">Team radio</span>
				<span className="text-[10px] text-zinc-700">auto-transcribed · may contain mistakes</span>
			</div>

			{latest.length === 0 ? (
				<p className="px-2 py-2 text-[11px] text-zinc-700">no radio yet</p>
			) : (
				<ul className="flex-1 overflow-y-auto">
					{latest.map((capture) => {
						const driver = drivers?.[capture.RacingNumber];
						if (!driver) return null;
						return <TranscriptLine key={capture.Path} driver={driver} capture={capture} sessionPath={sessionPath} />;
					})}
				</ul>
			)}
		</div>
	);
}

type LineProps = {
	driver: Driver;
	capture: RadioCapture;
	sessionPath: string | undefined;
};

function TranscriptLine({ driver, capture, sessionPath }: LineProps) {
	const transcript = useRadioTranscript(sessionPath, capture.Path);

	if (transcript.status === "unavailable") return null;
	if (transcript.status === "done" && !transcript.text) return null;

	return (
		<li className="flex items-start gap-[1ch] border-b border-zinc-900 px-2 py-1 text-sm">
			<time className="shrink-0 pt-0.5 text-[11px] text-zinc-600 tabular-nums">
				{utc(capture.Utc).local().format("HH:mm:ss")}
			</time>
			<DriverTag className="shrink-0" teamColor={driver.TeamColour} short={driver.Tla} />
			{transcript.status === "loading" ? (
				<span className="pt-0.5 text-[11px] text-zinc-700 select-none">transcribing…</span>
			) : (
				<p className="text-xs leading-snug text-zinc-300" title="Auto-transcribed with Whisper — may contain mistakes">
					{transcript.text}
				</p>
			)}
		</li>
	);
}
