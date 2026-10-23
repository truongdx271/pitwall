// Radio waveforms are decorative: the feed has no amplitude data (SPEC §7, §12). The bar
// heights come from a hash of the clip path, so a clip always draws the same shape.

// FNV-1a, then a small xorshift generator seeded with it.
const hash = (text: string): number => {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0 || 1;
};

/** `count` bar heights between 0.2 and 1 for the clip at `path`. */
export const waveformBars = (path: string, count = 48): number[] => {
	let x = hash(path);
	const bars: number[] = [];
	for (let i = 0; i < count; i++) {
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		x >>>= 0;
		bars.push(0.2 + (x % 1000) / 1250);
	}
	return bars;
};
