// Prefix for the qualifying part number (SQ1, Q2, ...) by session name.
export const sessionPartPrefix = (name: string) => {
	switch (name) {
		case "Sprint Qualifying":
			return "SQ";
		case "Qualifying":
			return "Q";
		default:
			return "";
	}
};
