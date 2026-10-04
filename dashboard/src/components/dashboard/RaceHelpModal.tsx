"use client";

import { useEffect } from "react";

type Props = {
	onClose: () => void;
};

export default function RaceHelpModal({ onClose }: Props) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
			<div
				className="w-full max-w-2xl overflow-y-auto rounded-none border border-zinc-700 bg-black font-mono text-sm text-zinc-300 shadow-2xl"
				style={{ maxHeight: "90vh" }}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2">
					<span className="text-[11px] tracking-widest text-zinc-500 uppercase">race — help</span>
					<button
						onClick={onClose}
						className="text-lg leading-none text-zinc-600 hover:text-zinc-300"
						aria-label="Close"
					>
						✕
					</button>
				</div>

				<div className="space-y-5 p-4">
					{/* Column overview */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">columns</div>
						<div className="space-y-1 text-zinc-400">
							<Row label="POS" desc="Current race position + driver code with team colour." />
							<Row label="INFO" desc="Driver status (see below)." />
							<Row
								label="<1s"
								desc="Within one second of the car ahead: the fuller and redder the bar, the closer the car."
							/>
							<Row label="GAP" desc="Gap to the leader." />
							<Row label="INT" desc="Interval to the car ahead. Green = closing in." />
							<Row label="LAP" desc="Last completed lap. If there is none yet, shows the best lap of the session." />
							<Row label="BEST" desc="Driver's best lap of the race." />
							<Row label="SECTORS" desc="Live mini-sector bars (see below)." />
							<Row label="TYRE" desc="Last 3 stints (current first, then older): compound and laps on each set." />
							<Row
								label="PACE"
								desc="Average pace per stint, excluding pit in/out laps. Toggle with the PACE button (see below)."
							/>
						</div>
					</section>

					{/* INFO column */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">INFO column — driver status</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow
								color="text-violet-400"
								char="FL"
								desc="Fastest lap — this driver holds the fastest lap of the race."
							/>
							<ColorRow color="text-emerald-400" char="+N" desc="Gained N positions since the start." />
							<ColorRow color="text-red-400" char="−N" desc="Lost N positions since the start." />
							<ColorRow color="text-zinc-600" char="NL" desc="No position change — shows laps completed." />
							<ColorRow color="text-cyan-400" char="PIT" desc="In the pit lane right now." />
							<ColorRow color="text-cyan-400" char="OUT" desc="Leaving the pits." />
							<ColorRow color="text-red-400" char="RET" desc="Retired from the race." />
							<ColorRow color="text-red-400" char="STP" desc="Stopped on track." />
						</div>
					</section>

					{/* PACE column */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">PACE column — pace per stint</div>

						<div className="mb-3 border border-zinc-800 p-3 text-zinc-400">
							<div className="mb-2 flex items-baseline gap-4 text-[12px]">
								<span>
									<span className="font-bold text-red-400">S</span>
									<span className="text-zinc-500"> 1:15.4</span>
								</span>
								<span>
									<span className="font-bold text-yellow-300">M</span>
									<span className="text-zinc-300"> 1:16.2</span>
									<span className="text-red-500"> +0.04</span>
								</span>
							</div>
							<p className="text-[11px] text-zinc-600">
								Stint 1 on softs: average 1:15.4 · Current stint on mediums: average 1:16.2, degrading +0.04s per lap
							</p>
						</div>

						<div className="space-y-1 text-[12px]">
							<p className="text-zinc-400">
								<span className="text-zinc-300">Compound letter</span>
								{" — "}in the compound&apos;s colour (see tyres below).
							</p>
							<p className="text-zinc-400">
								<span className="text-zinc-300">Average time</span>
								{" — "}mean of the stint&apos;s racing laps (excludes the pit out-lap and in-lap). The current stint is
								shown in <span className="text-zinc-200">white</span>, earlier ones in{" "}
								<span className="text-zinc-500">grey</span>.
							</p>
							<p className="text-zinc-400">
								<span className="text-zinc-300">Degradation (+/−)</span>
								{" — "}how many seconds per lap the pace is getting worse (or better) within the stint. Only shown once
								there are enough laps. <span className="text-red-500">Red</span> = high degradation,{" "}
								<span className="text-emerald-500">green</span> = improving.
							</p>
							<p className="mt-1 text-[11px] text-zinc-600">
								With only a few laps in the current stint, the average may not be representative yet.
							</p>
						</div>
					</section>

					{/* Sectors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">mini-sector bars (SECTORS)</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow
								color="text-violet-400"
								char="█"
								desc="Fastest of all drivers in that mini-sector (overall fastest)."
							/>
							<ColorRow color="text-emerald-400" char="█" desc="Driver's personal best in that mini-sector." />
							<ColorRow color="text-amber-400" char="█" desc="Completed, no improvement." />
							<ColorRow color="text-blue-400" char="█" desc="Pit in-lap or out-lap." />
							<ColorRow color="text-zinc-700" char="▒" desc="Mini-sector not yet reached on this lap." />
						</div>
					</section>

					{/* Lap time colors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">lap time colours</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow color="text-violet-400" char="1:15.387" desc="Fastest lap of the race." />
							<ColorRow color="text-emerald-400" char="1:16.012" desc="Driver's personal best lap." />
							<ColorRow color="text-zinc-300" char="1:17.540" desc="Regular lap." />
							<ColorRow
								color="text-zinc-600"
								char="1:18.201"
								desc="Best lap of the session (when there is no last lap)."
							/>
						</div>
					</section>

					{/* Tyre legend */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">tyres</div>
						<div className="space-y-1 text-[12px]">
							<TyreRow bg="bg-red-500" char="S" label="SOFT" desc="red" />
							<TyreRow bg="bg-yellow-300" char="M" label="MEDIUM" desc="yellow" />
							<TyreRow bg="bg-zinc-100" char="H" label="HARD" desc="white" />
							<TyreRow bg="bg-green-500" char="I" label="INTERMEDIATE" desc="green" />
							<TyreRow bg="bg-blue-500" char="W" label="WET" desc="blue" />
						</div>
						<p className="mt-1 text-[11px] text-zinc-700">The number after the letter is the laps on that set.</p>
					</section>

					{/* Row highlight colors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">row colour</div>
						<div className="space-y-1 text-[12px] text-zinc-400">
							<p>
								<span className="text-violet-400">Violet</span> — driver with the fastest lap of the race.
							</p>
							<p>
								<span className="text-sky-400">Blue</span> — driver marked as a favourite in settings.
							</p>
							<p>
								<span className="text-zinc-600">Dimmed</span> — driver retired, stopped or out of the race.
							</p>
						</div>
					</section>

					{/* Team radio panel */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">team radio (next to the map)</div>
						<p className="text-[12px] text-zinc-400">
							The latest 20 team radio clips as text, newest first. Transcripts are generated automatically (Whisper)
							and can mishear noisy radio — listen to the clip in the RADIOS tab when in doubt.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}

function Row({ label, desc }: { label: string; desc: string }) {
	return (
		<div className="flex gap-3 text-[12px]">
			<span className="w-[8ch] shrink-0 text-zinc-300">{label}</span>
			<span className="text-zinc-500">{desc}</span>
		</div>
	);
}

function ColorRow({ color, char, desc }: { color: string; char: string; desc: string }) {
	return (
		<div className="flex items-baseline gap-3">
			<span className={`w-[8ch] shrink-0 font-bold tabular-nums ${color}`}>{char}</span>
			<span className="text-zinc-500">{desc}</span>
		</div>
	);
}

function TyreRow({ bg, char, label, desc }: { bg: string; char: string; label: string; desc: string }) {
	return (
		<div className="flex items-baseline gap-3">
			<span className="w-[8ch] shrink-0">
				<span className={`px-[0.3ch] font-bold text-black ${bg}`}>{char} 0</span>
			</span>
			<span className="text-zinc-500">
				<span className="mr-1 text-zinc-400">{label}</span>
				{desc}
			</span>
		</div>
	);
}
