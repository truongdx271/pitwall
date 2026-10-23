import clsx from "clsx";

// The one source for the help text (SPEC §14): the /help page and the top-bar modal both
// render it, so the two never drift apart.

export const HELP_SECTIONS = [
	{ id: "timing", title: "Timing table" },
	{ id: "colours", title: "Colours" },
	{ id: "tyres", title: "Tyres" },
	{ id: "track-status", title: "Track status" },
	{ id: "sync", title: "Syncing with TV" },
	{ id: "limits", title: "What the data can't do" },
] as const;

const COLUMNS: [string, string][] = [
	["P", "Position. In qualifying and practice, ordered by best lap."],
	["DRIVER", "Three-letter code on the team colour."],
	["+/−", "Places gained or lost since the start. FL marks the fastest lap."],
	["<1S", "Fills up as the car closes within one second of the car ahead."],
	["GAP · INT", "Time behind the leader, and behind the car directly ahead."],
	["LAST · BEST", "Most recent lap, and the driver's best lap this session."],
	[
		"S1 · S2 · S3",
		"Sector times with the mini-sector bar under each. In qualifying and practice the small grey number is the personal best.",
	],
	["LAPS", "Practice only: laps completed in the session."],
	["TYRE", "Current set first, older sets dimmed."],
	["STATUS", "Qualifying and practice: push lap, long run, out lap, in pit or on track."],
];

const TYRES = [
	["S", "Soft", "bg-tyre-soft"],
	["M", "Medium", "bg-tyre-medium"],
	["H", "Hard", "bg-tyre-hard"],
	["I", "Intermediate", "bg-tyre-inter"],
	["W", "Wet", "bg-tyre-wet"],
] as const;

const FLAGS = [
	["Track clear", "bg-flag-clear/14 text-flag-clear"],
	["Yellow flag", "bg-flag-yellow text-bg"],
	["Virtual safety car", "bg-flag-sc text-bg"],
	["Safety car", "bg-flag-sc text-bg"],
	["Red flag", "bg-flag-red text-bg"],
] as const;

const LIMITS = [
	[
		"Positions are estimates",
		"The free feed has no GPS. The map places cars from mini-sector times, so expect the odd jump.",
	],
	["No car telemetry", "Speed, throttle and gear need an F1 TV subscription and are not shown."],
	["No lap predictions", "Push-lap deltas add up completed sectors only. They are not a prediction of the lap."],
	["No fuel loads", "Long-run pace is shown as it is: fuel loads aren't published, so compare with care."],
	["Radio waveforms are decorative", "The feed carries no audio levels, so the bars only show where the clip is."],
] as const;

export default function HelpContent({ compact = false }: { compact?: boolean }) {
	const h2 = clsx("font-semibold tracking-[-0.01em] text-fg-1", compact ? "text-base" : "text-xl");

	return (
		<div className={clsx("flex flex-col", compact ? "gap-8" : "gap-12")}>
			<section id="timing" className="flex scroll-mt-20 flex-col gap-3">
				<h2 className={h2}>Timing table</h2>
				<dl className="overflow-hidden rounded-panel border border-border">
					{COLUMNS.map(([col, text], i) => (
						<div
							key={col}
							className={clsx("grid grid-cols-[136px_1fr] gap-4 px-4 py-3 text-[13px]", i % 2 === 1 && "bg-row-alt")}
						>
							<dt className="text-xs font-semibold tracking-[0.02em] text-fg-1">{col}</dt>
							<dd className="text-fg-body">{text}</dd>
						</div>
					))}
				</dl>
			</section>

			<section id="colours" className="flex scroll-mt-20 flex-col gap-3">
				<h2 className={h2}>Colours</h2>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5 text-[13px]">
					<Swatch
						sample={<span className="font-mono text-base text-session-best">1:20.276</span>}
						text="Fastest of the session"
					/>
					<Swatch
						sample={<span className="font-mono text-base text-personal-best">1:20.351</span>}
						text="Driver's personal best"
					/>
					<Swatch
						sample={<span className="font-mono text-base text-slower">1:37.774</span>}
						text="Slower than their best"
					/>
					<Swatch
						sample={
							<span className="flex h-[3px] w-12 gap-px">
								{[0, 1, 2].map((k) => (
									<span key={k} className="h-full flex-1 bg-pit" />
								))}
							</span>
						}
						text="Mini-sector in the pit lane"
					/>
					<Swatch
						className="bg-fl-row"
						sample={<span className="text-xs font-semibold text-session-best">FL</span>}
						text="Purple row = holds the fastest lap"
					/>
					<Swatch
						className="bg-ko-row"
						sample={<span className="font-mono text-loss">17</span>}
						text="Red rows = qualifying knockout zone"
					/>
					<Swatch
						className="opacity-60"
						sample={<span className="font-mono text-fg-3">RET</span>}
						text="Dimmed = retired or stopped"
					/>
					<Swatch
						sample={
							<span className="text-xs">
								<span className="text-gain">▲3</span> <span className="text-loss">▼2</span>
							</span>
						}
						text="Places gained or lost since the start"
					/>
				</div>
			</section>

			<section id="tyres" className="flex scroll-mt-20 flex-col gap-3">
				<h2 className={h2}>Tyres</h2>
				<div className="flex flex-wrap gap-1.5">
					{TYRES.map(([letter, name, bg]) => (
						<span key={name} className={clsx("rounded-tag px-1.5 py-0.5 font-mono text-xs font-bold text-bg", bg)}>
							{letter} {name}
						</span>
					))}
				</div>
				<p className="text-[13px] leading-relaxed text-fg-body">
					Up to three sets, newest on the left; the number is laps on that set. Turn on{" "}
					<b className="text-fg-1">Pace view</b> to add each stint&apos;s average push-lap time, and in practice how
					much it slows per lap.
				</p>
			</section>

			<section id="track-status" className="flex scroll-mt-20 flex-col gap-3">
				<h2 className={h2}>Track status</h2>
				<div className="flex flex-wrap gap-2">
					{FLAGS.map(([label, cls]) => (
						<span key={label} className={clsx("rounded-control px-3 py-1.5 text-[13px] font-semibold", cls)}>
							{label}
						</span>
					))}
				</div>
				<p className="text-[13px] leading-relaxed text-fg-body">
					Anything other than a clear track also shows a full-width banner under the session bar, so you notice it from
					across the room.
				</p>
			</section>

			<section id="sync" className="flex scroll-mt-20 flex-col gap-3">
				<h2 className={h2}>Syncing with your TV</h2>
				<ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-fg-body">
					<li>Open the Live chip in the top bar.</li>
					<li>Watch the lap counter on TV tick over.</li>
					<li>Nudge the delay until Pitwall changes at the same moment. It is saved in this browser.</li>
				</ol>
			</section>

			<section id="limits" className="flex scroll-mt-20 flex-col gap-3">
				<h2 className={h2}>What the data can&apos;t do</h2>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5">
					{LIMITS.map(([title, text]) => (
						<div key={title} className="flex flex-col gap-1 rounded-control border border-border p-3.5">
							<span className="text-[13px] font-semibold text-fg-1">{title}</span>
							<span className="text-xs leading-relaxed text-fg-2">{text}</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}

function Swatch({ sample, text, className }: { sample: React.ReactNode; text: string; className?: string }) {
	return (
		<div className={clsx("flex items-center gap-3 rounded-control border border-border px-3.5 py-3", className)}>
			{sample}
			<span className="text-fg-body">{text}</span>
		</div>
	);
}
