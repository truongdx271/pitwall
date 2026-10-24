import { WeatherMap } from "@/app/dashboard/weather/map";
import WeatherPanel from "@/app/dashboard/weather/panel";

import Panel from "@/components/ui/Panel";

// Weather tab (SPEC §9): the rain radar with its timeline, and the trackside conditions.
export default function WeatherPage() {
	return (
		<div className="flex h-full flex-wrap items-stretch gap-3 p-3 xl:flex-nowrap">
			<Panel title="Rain radar" className="min-h-[520px] min-w-0 flex-[999_1_640px]">
				<div className="relative min-h-0 flex-1 border-t border-border">
					<WeatherMap />
				</div>
				<p className="px-3 py-2 text-[11px] text-fg-3">
					Radar © RainViewer · Base map © OpenStreetMap contributors © CARTO
				</p>
			</Panel>
			<div className="min-w-0 flex-[1_1_360px] xl:max-w-[440px]">
				<WeatherPanel />
			</div>
		</div>
	);
}
