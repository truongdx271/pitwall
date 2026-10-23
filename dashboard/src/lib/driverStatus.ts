import type { TimingDataDriver } from "@/types/state.type";

export type DriverStatus = "pit" | "outlap" | "longrun" | "push" | "track";

export const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = {
	pit: "In pit",
	outlap: "Out lap",
	longrun: "Long run",
	push: "Push lap",
	track: "On track",
};

// Text colour for the STATUS column (SPEC §4, §5).
export const DRIVER_STATUS_COLOR: Record<DriverStatus, string> = {
	pit: "text-pit",
	outlap: "text-fg-2",
	longrun: "text-fg-1",
	push: "text-personal-best",
	track: "text-fg-3",
};

type Driver = Pick<TimingDataDriver, "InPit" | "PitOut" | "KnockedOut" | "Stopped" | "Sectors">;

/**
 * What a car is doing right now, from the feed flags plus inference (the feed has no
 * explicit "push lap"). Rules in order: In pit, Out lap, Long run (practice only, passed in),
 * Push lap, On track.
 */
export const driverStatus = (driver: Driver, { longRun = false }: { longRun?: boolean } = {}): DriverStatus => {
	if (driver.InPit) return "pit";

	const sectors = driver.Sectors ?? [];
	if (driver.PitOut || sectors.some((s) => s.Segments?.some((seg) => seg.Status === 2064))) return "outlap";

	if (driver.KnockedOut || driver.Stopped) return "track";
	if (longRun) return "longrun";

	// A completed current-lap sector that is a personal best.
	if (sectors.some((s) => !!s.Value && s.PersonalFastest)) return "push";

	return "track";
};
