import { useSyncExternalStore } from "react";

// Phones get their own layout below 768px (SPEC §11); 768–1279 uses the desktop one.
const QUERY = "(max-width: 767px)";

const subscribe = (onChange: () => void) => {
	const mql = window.matchMedia(QUERY);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
};

export const useIsMobile = () =>
	useSyncExternalStore(
		subscribe,
		() => window.matchMedia(QUERY).matches,
		() => false,
	);
