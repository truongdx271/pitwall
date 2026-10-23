import Link from "next/link";

import Icon, { type IconName } from "@/components/shell/icons";
import WeekendStatus from "@/components/home/WeekendStatus";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
	{
		icon: "live",
		title: "Live timing",
		text: "All 22 cars on one screen: gaps, intervals, sectors and mini-sectors, in F1's purple, green and yellow.",
	},
	{
		icon: "map",
		title: "Track map",
		text: "See where everyone is on the lap, who is in the pit lane, and follow your favourite drivers.",
	},
	{
		icon: "messages",
		title: "Radio with transcripts",
		text: "Team radio as it airs, transcribed automatically, next to every race control decision.",
	},
	{
		icon: "strategy",
		title: "Strategy",
		text: "Tyre stints, stint pace and degradation, lap-time comparisons and speed traps.",
	},
];

const GOOD_TO_KNOW = [
	{
		title: "Watching on TV?",
		text: "Broadcasts run behind live timing. Add a delay in Settings so the numbers change when the TV does.",
	},
	{
		title: "Positions are estimates",
		text: "The free feed has no GPS, so the map places cars from mini-sector times. Expect the odd jump.",
	},
	{
		title: "No car telemetry",
		text: "Speed, throttle and gear need an F1 TV subscription and are not shown.",
	},
];

// A static picture of the timing table, not live data.
const PREVIEW = [
	["1", "ANT", "#27F4D2", "Leader", "1:21.447", "S 2"],
	["2", "RUS", "#27F4D2", "+0.789", "1:20.925", "S 2"],
	["3", "HAM", "#E8002D", "+1.403", "1:20.670", "S 2"],
	["4", "VER", "#4781D7", "+2.345", "1:20.276", "S 2"],
	["5", "LEC", "#E8002D", "+2.946", "1:20.351", "S 2"],
	["6", "HAD", "#4781D7", "+4.144", "1:20.676", "S 2"],
];

export default function Home() {
	return (
		<div className="flex flex-col gap-14 py-16">
			<section className="flex flex-wrap items-center gap-10">
				<div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
					<WeekendStatus />
					<h1 className="text-5xl leading-[1.05] font-semibold tracking-[-0.03em] text-fg-1 sm:text-6xl">
						Live Formula 1 timing for your second screen
					</h1>
					<p className="max-w-xl text-lg leading-relaxed text-fg-2">
						Gaps, sectors, tyres, team radio and race control in one dark dashboard. Set a delay and it stays in step
						with your TV.
					</p>
					<div className="flex flex-wrap gap-2.5">
						<Link
							href="/dashboard"
							className="flex h-11 items-center gap-2 rounded-control bg-fg-1 px-4 text-sm font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-1"
						>
							Open live dashboard <span aria-hidden>→</span>
						</Link>
						<Link
							href="/schedule"
							className="flex h-11 items-center rounded-control border border-border-strong px-4 text-sm font-medium text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
						>
							View schedule
						</Link>
					</div>
				</div>

				<div
					aria-hidden
					className="flex min-w-0 flex-[1_1_420px] flex-col gap-1 rounded-panel border border-border bg-surface-1 p-4"
				>
					<div className="mb-2 flex items-center gap-2 px-1">
						<span className="text-[13px] font-semibold">Canadian Grand Prix</span>
						<span className="font-mono text-xs text-fg-3">LAP 3/68</span>
						<span className="ml-auto rounded-md bg-flag-clear/14 px-2 py-0.5 text-xs font-semibold text-flag-clear">
							Track clear
						</span>
					</div>
					{PREVIEW.map(([p, tla, colour, gap, best, tyre], i) => (
						<div
							key={tla}
							className={`flex h-row items-center gap-3 rounded-md px-2 font-mono text-[13px] tabular-nums ${i === 3 ? "bg-fl-row" : i % 2 === 1 ? "bg-row-alt" : ""}`}
						>
							<span className="w-4 text-right text-fg-2">{p}</span>
							<span
								className="w-11 rounded-tag py-0.5 text-center font-sans text-xs font-bold"
								style={{ backgroundColor: colour, color: "#0A0C0F" }}
							>
								{tla}
							</span>
							<span className={`ml-auto ${gap === "Leader" ? "font-sans text-fg-3" : "text-fg-1"}`}>{gap}</span>
							<span className={`w-[72px] text-right ${i === 3 ? "text-session-best" : "text-personal-best"}`}>
								{best}
							</span>
							<span className="rounded-tag bg-tyre-soft px-1.5 py-0.5 text-xs font-bold text-bg">{tyre}</span>
						</div>
					))}
				</div>
			</section>

			<section aria-label="Features" className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
				{FEATURES.map((f) => (
					<div key={f.title} className="flex flex-col gap-2.5 rounded-panel border border-border bg-surface-1 p-5">
						<Icon name={f.icon} size={20} className="text-fg-1" />
						<h2 className="text-[15px] font-semibold">{f.title}</h2>
						<p className="text-[13px] leading-relaxed text-fg-2">{f.text}</p>
					</div>
				))}
			</section>

			<section
				aria-label="Good to know"
				className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 rounded-panel border border-border p-6"
			>
				{GOOD_TO_KNOW.map((g) => (
					<div key={g.title} className="flex flex-col gap-1.5">
						<h2 className="text-sm font-semibold">{g.title}</h2>
						<p className="text-[13px] leading-relaxed text-fg-2">{g.text}</p>
					</div>
				))}
			</section>
		</div>
	);
}
