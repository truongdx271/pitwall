import { useEffect, useState } from "react";

export type PositionMove = "up" | "down";

/**
 * Which way the position just moved, held for `ms` after each change, then null.
 * Nothing on mount: only changes seen while the row is on screen count.
 */
export const usePositionFlash = (position: number, ms = 2_000): PositionMove | null => {
	const [prev, setPrev] = useState(position);
	const [move, setMove] = useState<PositionMove | null>(null);

	// Derive during render so the arrow shows in the same frame the row moves.
	if (position !== prev) {
		setPrev(position);
		setMove(position < prev ? "up" : "down");
	}

	// `prev` restarts the timer when the driver moves again before it ran out.
	useEffect(() => {
		if (!move) return;
		const t = setTimeout(() => setMove(null), ms);
		return () => clearTimeout(t);
	}, [move, prev, ms]);

	return move;
};
