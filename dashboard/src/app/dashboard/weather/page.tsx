import { WeatherMap } from "@/app/dashboard/weather/map";
import WeatherPanel from "@/app/dashboard/weather/panel";

export default function WeatherPage() {
	// calc height is a workaround, maybe think about refactoring sometime
	return (
		<div className="relative h-[calc(100%-142px)] w-full md:h-full">
			<WeatherPanel />
			<WeatherMap />
		</div>
	);
}
