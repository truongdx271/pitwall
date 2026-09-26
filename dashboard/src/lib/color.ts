// Helpers for F1 team colours, which the feed sends as 6-digit hex without "#".

export function isLight(hex: string): boolean {
	if (!hex || hex.length < 6) return false;
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// Readable text colour on top of a team colour.
export function textOn(hex: string | undefined): "#000" | "#fff" {
	return hex && isLight(hex) ? "#000" : "#fff";
}
