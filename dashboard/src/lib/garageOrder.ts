// Garages are allocated by the previous season's constructors' standings: the
// champions sit nearest the pit entry, the last team (and newcomers) nearest the exit.
// 2026 follows the 2025 table (Jolpica); Sauber raced 2025 under the name Audi now uses.
const GARAGES_2026 = [
	"McLaren",
	"Mercedes",
	"Red Bull Racing",
	"Ferrari",
	"Williams",
	"Racing Bulls",
	"Aston Martin",
	"Haas F1 Team",
	"Audi",
	"Alpine",
	"Cadillac",
];

type Driver = { RacingNumber: string; TeamName: string };

// Racing numbers from pit entry to pit exit; teammates by car number, unknown teams last.
export function garageOrder(drivers: Driver[]): string[] {
	const rank = (team: string) => {
		const i = GARAGES_2026.indexOf(team);
		return i === -1 ? GARAGES_2026.length : i;
	};
	return [...drivers]
		.sort((a, b) => rank(a.TeamName) - rank(b.TeamName) || Number(a.RacingNumber) - Number(b.RacingNumber))
		.map((d) => d.RacingNumber);
}
