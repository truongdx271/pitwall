"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

import type { Driver } from "@/types/state.type";

import { env } from "@/env";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Followed drivers (Settings.png): a grid of TLA chips with the team colour; tap to toggle.
export default function FavoriteDrivers() {
	const sessionDrivers = useDataStore((s) => s.state?.DriverList);
	const [fetched, setFetched] = useState<Driver[] | null>(null);
	const favoriteDrivers = useSettingsStore((s) => s.favoriteDrivers);
	const setFavoriteDrivers = useSettingsStore((s) => s.setFavoriteDrivers);

	// The session's driver list when there is one; otherwise ask the relay, as before.
	useEffect(() => {
		if (sessionDrivers) return;
		let cancelled = false;
		fetch(`${env.NEXT_PUBLIC_LIVE_URL}/api/drivers`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data: unknown) => !cancelled && Array.isArray(data) && setFetched(data as Driver[]))
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [sessionDrivers]);

	// Partly merged entries can lack a code or number; skip them.
	const drivers = (sessionDrivers ? Object.values(sessionDrivers) : (fetched ?? [])).filter(
		(d) => d?.Tla && d.RacingNumber,
	);
	const sorted = [...drivers].sort((a, b) => a.Line - b.Line);

	const toggle = (nr: string) =>
		setFavoriteDrivers(
			favoriteDrivers.includes(nr) ? favoriteDrivers.filter((d) => d !== nr) : [...favoriteDrivers, nr],
		);

	if (sorted.length === 0) {
		return <p className="text-[13px] text-fg-2">The driver list appears once a session has loaded.</p>;
	}

	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
			{sorted.map((d) => {
				const on = favoriteDrivers.includes(d.RacingNumber);
				return (
					<button
						key={d.RacingNumber}
						type="button"
						aria-pressed={on}
						aria-label={`Follow ${d.FullName}`}
						onClick={() => toggle(d.RacingNumber)}
						className={clsx(
							"flex h-10 cursor-pointer items-center gap-2 rounded-control border px-2.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-fg-1",
							on ? "border-fg-1 bg-surface-3" : "border-border-subtle hover:border-border-strong",
						)}
					>
						<span
							aria-hidden
							className="h-[18px] w-1 rounded-sm"
							style={{ backgroundColor: d.TeamColour ? `#${d.TeamColour}` : "var(--color-fg-3)" }}
						/>
						{d.Tla}
					</button>
				);
			})}
		</div>
	);
}
