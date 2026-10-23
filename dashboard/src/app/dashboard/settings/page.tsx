"use client";

import type { ReactNode } from "react";

import SegmentedControls from "@/components/ui/SegmentedControls";
import Button from "@/components/ui/Button";
import Slider from "@/components/ui/Slider";
import Input from "@/components/ui/Input";

import FavoriteDrivers from "@/components/settings/FavoriteDrivers";

import DelayInput from "@/components/DelayInput";
import DelayTimer from "@/components/DelayTimer";
import Toggle from "@/components/ui/Toggle";

import { useSettingsStore } from "@/stores/useSettingsStore";
import Footer from "@/components/Footer";

function SectionHeader({ label }: { label: string }) {
	return (
		<div className="my-4 border-b border-border pb-1">
			<p className="text-[11px] tracking-widest text-fg-3 uppercase">{label}</p>
		</div>
	);
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-center gap-[1.5ch] py-1">
			{children}
			<p className="text-sm text-fg-2">{label}</p>
		</div>
	);
}

export default function SettingsPage() {
	const settings = useSettingsStore();

	return (
		<div className="font-mono">
			<div className="my-4 border-b border-border pb-1">
				<p className="text-[11px] tracking-widest text-fg-1 uppercase">{">"} settings</p>
			</div>

			<SectionHeader label="visual" />

			<SettingRow label="show car metrics (rpm, gear, speed)">
				<Toggle
					label="show car metrics (rpm, gear, speed)"
					enabled={settings.carMetrics}
					setEnabled={(v) => settings.setCarMetrics(v)}
				/>
			</SettingRow>

			<SettingRow label="show corner numbers on track map">
				<Toggle
					label="show corner numbers on track map"
					enabled={settings.showCornerNumbers}
					setEnabled={(v) => settings.setShowCornerNumbers(v)}
				/>
			</SettingRow>

			<SettingRow label="show driver table header">
				<Toggle
					label="show driver table header"
					enabled={settings.tableHeaders}
					setEnabled={(v) => settings.setTableHeaders(v)}
				/>
			</SettingRow>

			<SettingRow label="show drivers best sectors">
				<Toggle
					label="show drivers best sectors"
					enabled={settings.showBestSectors}
					setEnabled={(v) => settings.setShowBestSectors(v)}
				/>
			</SettingRow>

			<SettingRow label="show drivers mini sectors">
				<Toggle
					label="show drivers mini sectors"
					enabled={settings.showMiniSectors}
					setEnabled={(v) => settings.setShowMiniSectors(v)}
				/>
			</SettingRow>

			<SettingRow label="use safety car colors">
				<Toggle
					label="use safety car colors"
					enabled={settings.useSafetyCarColors}
					setEnabled={(v) => settings.setUseSafetyCarColors(v)}
				/>
			</SettingRow>

			<SectionHeader label="race control" />

			<SettingRow label="play chime on new race control message">
				<Toggle
					label="play chime on new race control message"
					enabled={settings.raceControlChime}
					setEnabled={(v) => settings.setRaceControlChime(v)}
				/>
			</SettingRow>

			{settings.raceControlChime && (
				<div className="flex flex-row items-center gap-[1.5ch] py-1">
					<Input
						value={String(settings.raceControlChimeVolume)}
						setValue={(v) => {
							const numericValue = Number(v);
							if (!isNaN(numericValue)) {
								settings.setRaceControlChimeVolume(numericValue);
							}
						}}
					/>
					<Slider
						className="w-52!"
						value={settings.raceControlChimeVolume}
						setValue={(v) => settings.setRaceControlChimeVolume(v)}
					/>
					<p className="text-sm text-fg-2">chime volume</p>
				</div>
			)}

			<SectionHeader label="favorite drivers" />

			<p className="mb-4 text-sm text-fg-2">select your favorite drivers to highlight them on the dashboard.</p>

			<FavoriteDrivers />

			<SectionHeader label="speed unit" />

			<p className="mb-4 text-sm text-fg-2">choose the unit for displaying speeds.</p>

			<SegmentedControls
				id="speed-unit"
				selected={settings.speedUnit}
				onSelect={settings.setSpeedUnit}
				options={[
					{ label: "km/h", value: "metric" },
					{ label: "mp/h", value: "imperial" },
				]}
			/>

			<SectionHeader label="delay" />

			<p className="mb-4 text-sm text-fg-2">
				set a delay in seconds — data will be displayed later than the live edge. useful for syncing with a broadcast
				stream.
			</p>

			<div className="flex items-center gap-[1.5ch]">
				<DelayTimer />
				<DelayInput />
				<p className="text-sm text-fg-2">delay in seconds</p>
			</div>

			<Button className="mt-3 border-loss/40! text-loss! hover:border-loss!" onClick={() => settings.setDelay(0)}>
				reset delay
			</Button>

			<Footer />
		</div>
	);
}
