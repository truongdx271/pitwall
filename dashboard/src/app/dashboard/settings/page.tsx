"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import SegmentedControls from "@/components/ui/SegmentedControls";
import Slider from "@/components/ui/Slider";
import Toggle from "@/components/ui/Toggle";
import FavoriteDrivers from "@/components/settings/FavoriteDrivers";

import { useSettingsStore } from "@/stores/useSettingsStore";

// Settings (SPEC §14, Settings.png). Everything is saved in this browser.
export default function SettingsPage() {
	const settings = useSettingsStore();

	const display: { label: string; hint: string; on: boolean; set: (v: boolean) => void }[] = [
		{
			label: "Car metrics",
			hint: "RPM, gear and speed. Needs an F1 TV feed.",
			on: settings.carMetrics,
			set: settings.setCarMetrics,
		},
		{
			label: "Corner numbers on the map",
			hint: "Numbered badges at each corner.",
			on: settings.showCornerNumbers,
			set: settings.setShowCornerNumbers,
		},
		{
			label: "Table column headers",
			hint: "Turn off for a denser timing table.",
			on: settings.tableHeaders,
			set: settings.setTableHeaders,
		},
		{
			label: "Best sectors",
			hint: "Personal-best sector next to the current one.",
			on: settings.showBestSectors,
			set: settings.setShowBestSectors,
		},
		{
			label: "Mini-sectors",
			hint: "The coloured bar under each sector time.",
			on: settings.showMiniSectors,
			set: settings.setShowMiniSectors,
		},
		{
			label: "Safety car colours",
			hint: "Tint the track status banner amber under SC and VSC.",
			on: settings.useSafetyCarColors,
			set: settings.setUseSafetyCarColors,
		},
	];

	const paused = settings.delayIsPaused;

	return (
		<div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-6 pt-8 pb-16">
			<div className="flex flex-col gap-1.5">
				<h1 className="text-[28px] font-semibold tracking-[-0.02em]">Settings</h1>
				<p className="text-sm text-fg-2">Saved in this browser. Changes apply straight away.</p>
			</div>

			<Card title="Broadcast delay" hint="Show data later than live so it matches your TV or stream.">
				<div className="flex flex-wrap items-center gap-2.5">
					<StepButton
						label="Decrease delay by 1 second"
						disabled={paused}
						onClick={() => settings.setDelay(Math.max(0, settings.delay - 1))}
					>
						−
					</StepButton>
					<div className="flex h-11 w-40 items-center justify-center gap-1.5 rounded-[10px] border border-border-subtle bg-bg">
						<span className="font-mono text-[22px] font-semibold tabular-nums">{settings.delay}</span>
						<span className="text-[13px] text-fg-2">seconds</span>
					</div>
					<StepButton
						label="Increase delay by 1 second"
						disabled={paused}
						onClick={() => settings.setDelay(settings.delay + 1)}
					>
						+
					</StepButton>
					<button
						type="button"
						onClick={() => settings.setDelay(0)}
						disabled={paused}
						className="h-11 cursor-pointer rounded-[10px] border border-border-subtle px-3.5 text-[13px] text-fg-2 hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1 disabled:opacity-50"
					>
						Back to live
					</button>
					<Link href="/help#sync" className="text-[13px] text-fg-2 underline hover:text-fg-1">
						How to sync
					</Link>
				</div>
			</Card>

			<section
				aria-labelledby="s-display"
				className="flex flex-col overflow-hidden rounded-panel border border-border bg-surface-1"
			>
				<h2 id="s-display" className="px-5 pt-4.5 pb-1.5 text-[15px] font-semibold">
					Display
				</h2>
				{display.map((row) => (
					<div key={row.label} className="flex items-center gap-4 border-t border-border px-5 py-3.5">
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="text-sm">{row.label}</span>
							<span className="text-xs text-fg-3">{row.hint}</span>
						</div>
						<Toggle label={row.label} enabled={row.on} setEnabled={row.set} />
					</div>
				))}
			</section>

			<Card
				title="Race control chime"
				hint="Play a sound when race control posts a message."
				action={
					<Toggle
						label="Race control chime"
						enabled={settings.raceControlChime}
						setEnabled={settings.setRaceControlChime}
					/>
				}
			>
				{settings.raceControlChime && (
					<label className="flex items-center gap-3 text-[13px] text-fg-2">
						Volume
						<Slider
							className="max-w-80 flex-1"
							value={settings.raceControlChimeVolume}
							setValue={settings.setRaceControlChimeVolume}
						/>
						<span className="w-10 font-mono text-fg-1 tabular-nums">{settings.raceControlChimeVolume}%</span>
					</label>
				)}
			</Card>

			<Card title="Followed drivers" hint="Highlighted in every table and ringed on the map.">
				<FavoriteDrivers />
			</Card>

			<Card
				title="Speed unit"
				hint="Used for speed traps."
				action={
					<SegmentedControls
						selected={settings.speedUnit}
						onSelect={settings.setSpeedUnit}
						options={[
							{ label: "km/h", value: "metric" },
							{ label: "mph", value: "imperial" },
						]}
					/>
				}
			/>
		</div>
	);
}

type CardProps = { title: string; hint: string; action?: ReactNode; children?: ReactNode };

function Card({ title, hint, action, children }: CardProps) {
	return (
		<section className="flex flex-col gap-3.5 rounded-panel border border-border bg-surface-1 p-5">
			<div className="flex items-center gap-4">
				<div className="flex flex-1 flex-col gap-1">
					<h2 className="text-[15px] font-semibold">{title}</h2>
					<span className="text-[13px] text-fg-2">{hint}</span>
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

function StepButton({
	label,
	disabled,
	onClick,
	children,
}: {
	label: string;
	disabled: boolean;
	onClick: () => void;
	children: string;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			className="flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-border-strong bg-surface-2 text-xl text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1 disabled:opacity-50"
		>
			{children}
		</button>
	);
}
