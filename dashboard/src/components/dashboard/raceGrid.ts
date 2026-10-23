// Column template for the race classification (SPEC §3.1). The header and every row use
// this one string, so the columns can't drift apart.
//                P    DRIVER +/−  <1S  GAP  INT  LAST BEST S1·S2·S3            TYRE
export const raceGridCols = (pace: boolean) =>
	pace
		? "24px 48px 40px 30px 72px 64px 76px 76px minmax(150px, 1fr) 280px"
		: "24px 48px 40px 30px 72px 64px 76px 76px minmax(0, 1fr) 120px";

export const RACE_GRID_GAP = "6px";

// S1 · S2 · S3 share one sub-grid of three equal columns.
export const SECTOR_GRID = "repeat(3, minmax(0, 1fr))";
export const SECTOR_GRID_GAP = "8px";

// Qualifying (SPEC §4). STATUS is the last 92px column, where practice puts it too.
//                     P    DRIVER GAP  BEST LAST S1·S2·S3      TYRE  STATUS
export const QUALI_GRID_COLS = "24px 48px 72px 80px 80px minmax(0, 1fr) 120px 92px";
export const QUALI_SECTOR_GAP = "10px";
