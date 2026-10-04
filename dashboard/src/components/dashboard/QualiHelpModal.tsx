"use client";

import { useEffect } from "react";

type Props = {
	onClose: () => void;
};

export default function QualiHelpModal({ onClose }: Props) {
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
					<span className="text-[11px] tracking-widest text-zinc-500 uppercase">qualifying mode — help</span>
					<button
						onClick={onClose}
						className="text-lg leading-none text-zinc-600 hover:text-zinc-300"
						aria-label="Close"
					>
						✕
					</button>
				</div>

				<div className="space-y-5 p-4">
					{/* Layout overview */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">columns</div>
						<div className="space-y-1 text-zinc-400">
							<Row label="POS" desc="Qualifying position by best lap." />
							<Row label="GAP" desc="Gap to the leader (pole). LEADER = P1." />
							<Row
								label="BEST"
								desc="Driver's best complete lap of the session."
								accent="violet"
								accentText="violet = fastest of all"
							/>
							<Row
								label="LAST"
								desc="Last completed lap."
								accent="emerald"
								accentText="green = lap PB · violet = fastest of all"
							/>
							<Row label="S1 / S2 / S3" desc="Sector columns (see below)." />
							<Row label="TYRE" desc="Last 3 stints (current first, then older): compound and laps on each set." />
						</div>
					</section>

					{/* Sector column detail */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">
							each sector column (S1, S2, S3)
						</div>

						<div className="border border-zinc-800 p-3 text-zinc-400">
							<div className="mb-3 flex flex-col gap-[3px]">
								<span className="text-zinc-300">20.600</span>
								<span className="text-[11px] text-zinc-600">
									<span className="text-zinc-500">████████</span> <span className="text-zinc-400">26.755</span>{" "}
									<span className="text-red-500">+6.155</span>
								</span>
							</div>

							<div className="space-y-1 text-[12px]">
								<p>
									<span className="text-zinc-300">Line 1 (large)</span>
									{" — "}driver&apos;s best sector of the session. Fixed reference.
								</p>
								<p>
									<span className="text-zinc-300">Line 2 (small)</span>
									{" — "}what is happening on the current lap:
								</p>
								<ul className="ml-3 space-y-0.5 text-zinc-500">
									<li>
										<span className="text-amber-400">████</span> bars = driver is in this sector now
									</li>
									<li>number = sector time completed on this lap</li>
								</ul>
							</div>
						</div>
					</section>

					{/* Sector bar colors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">mini-sector bar colours (█)</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow
								color="text-violet-400"
								char="█"
								label="VIOLET"
								desc="Fastest of all drivers in that mini-sector"
							/>
							<ColorRow
								color="text-emerald-400"
								char="█"
								label="GREEN"
								desc="Driver's personal best in that mini-sector"
							/>
							<ColorRow color="text-amber-400" char="█" label="YELLOW" desc="Completed, no improvement on their best" />
							<ColorRow color="text-blue-400" char="█" label="BLUE" desc="Pit in-lap or out-lap" />
							<ColorRow color="text-zinc-700" char="▒" label="GREY" desc="Mini-sector not yet reached" />
						</div>
					</section>

					{/* Lap time colors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">time colours</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow
								color="text-violet-400"
								char="1:12.578"
								label=""
								desc="Fastest lap / sector of the session (overall fastest)"
							/>
							<ColorRow color="text-emerald-400" char="20.547" label="" desc="Personal best" />
							<ColorRow color="text-zinc-300" char="26.755" label="" desc="Regular time on this lap" />
							<ColorRow color="text-zinc-700" char="29.081" label="" desc="Time from a previous lap (no delta)" />
						</div>
					</section>

					{/* Session parts */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">session parts</div>
						<div className="space-y-1 text-[12px] text-zinc-400">
							<p>
								<span className="text-zinc-200">Q1</span> — 22 drivers, the 6 slowest are knocked out (16 go through)
							</p>
							<p>
								<span className="text-zinc-200">Q2</span> — 16 drivers, the 6 slowest are knocked out (10 go through)
							</p>
							<p>
								<span className="text-zinc-200">Q3</span> — 10 drivers fight for pole position
							</p>
							<p className="text-zinc-600">Knocked-out drivers are dimmed.</p>
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
						<p className="mt-1 text-[11px] text-zinc-700">
							The number after the letter is the laps on that set. pN = pit stops.
						</p>
					</section>

					{/* Tip */}
					<div className="border-t border-zinc-800 pt-3 text-[11px] text-zinc-600">
						TIP: mini-sector bars update live — green means the driver is faster than their best in that mini-sector.
					</div>
				</div>
			</div>
		</div>
	);
}

function Row({
	label,
	desc,
	accent,
	accentText,
}: {
	label: string;
	desc: string;
	accent?: string;
	accentText?: string;
}) {
	return (
		<div className="flex gap-3 text-[12px]">
			<span className="w-[8ch] shrink-0 text-zinc-300">{label}</span>
			<span className="text-zinc-500">
				{desc}
				{accentText && (
					<>
						{" "}
						<span className={accent === "violet" ? "text-violet-400" : "text-emerald-400"}>({accentText})</span>
					</>
				)}
			</span>
		</div>
	);
}

function ColorRow({ color, char, label, desc }: { color: string; char: string; label: string; desc: string }) {
	return (
		<div className="flex items-baseline gap-3">
			<span className={`w-[8ch] shrink-0 tabular-nums ${color}`}>{char}</span>
			<span className="text-zinc-500">
				{label && <span className="mr-1 text-zinc-400">{label}</span>}
				{desc}
			</span>
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
