"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { circuitLocalTime, sessionRemaining } from "@/lib/sessionClock";
import { latestSessionStatus, trackStatusView } from "@/lib/trackStatus";
import { sessionKind } from "@/lib/sessionKind";

import Icon, { LogoMark, type IconName } from "@/components/shell/icons";
import LiveChip from "@/components/shell/LiveChip";
import { STATUS_PILL } from "@/components/shell/SessionStrip";
import { parseTab, tabHref, type TabId } from "@/components/shell/tabs";
import DelayInput from "@/components/DelayInput";
import DelayTimer from "@/components/DelayTimer";
import TabLink from "@/components/shell/TabLink";

const useNow = () => {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);
	return now;
};

// 48px header (SPEC §11): logo, meeting, session and clock, Live chip.
export function MobileHeader({ connected }: { connected: boolean }) {
	const session = useDataStore((s) => s.state?.SessionInfo);
	const hasSession = !!session;
	const delay = useSettingsStore((s) => s.delay);
	const local = circuitLocalTime(useNow(), session?.GmtOffset, delay);

	return (
		<header className="flex h-12 items-center gap-3 border-b border-border px-3">
			<Link href="/" aria-label="pitwall home" className="-ml-2.5 flex size-11 shrink-0 items-center justify-center">
				<LogoMark />
			</Link>
			<div className="flex min-w-0 flex-1 flex-col leading-tight">
				<span className="truncate text-[15px] font-semibold">
					{session?.Meeting.Name.replace(/Grand Prix/i, "GP") ?? "pitwall"}
				</span>
				{session && (
					<span className="truncate text-xs text-fg-2">
						{session.Name}
						{local && <span className="font-mono"> · {local}</span>}
					</span>
				)}
			</div>
			<LiveChip connected={connected} hasSession={hasSession} />
		</header>
	);
}

// 44px status row, always visible: lap or clock, track temperature and rain, track status.
export function MobileStatusRow() {
	const session = useDataStore((s) => s.state?.SessionInfo);
	const lap = useDataStore((s) => s.state?.LapCount);
	const clock = useDataStore((s) => s.state?.ExtrapolatedClock);
	const weather = useDataStore((s) => s.state?.WeatherData);
	const code = useDataStore((s) => s.state?.TrackStatus?.Status);
	const sessionStatus = useDataStore((s) =>
		latestSessionStatus(s.state?.SessionData?.StatusSeries, s.state?.SessionStatus?.Status),
	);
	const delay = useSettingsStore((s) => s.delay);
	const now = useNow();

	if (!session) return null;
	const status = trackStatusView(code, sessionStatus);
	const race = sessionKind(session) === "race";

	return (
		<div className="flex h-11 items-center gap-3 border-b border-border px-3">
			{race && lap ? (
				<span className="flex items-baseline gap-1">
					<span className="text-[11px] text-fg-3">LAP</span>
					<span className="font-mono text-lg font-semibold tabular-nums">{lap.CurrentLap}</span>
					<span className="font-mono text-xs text-fg-3">/{lap.TotalLaps}</span>
				</span>
			) : (
				<span className="font-mono text-lg font-semibold tabular-nums">
					{sessionRemaining(clock, now, delay) ?? "--:--"}
				</span>
			)}
			{weather && (
				<span className="truncate text-xs text-fg-2">
					<span className="font-mono">{Math.round(parseFloat(weather.TrackTemp))}°</span> track ·{" "}
					{weather.Rainfall === "1" ? "Rain" : "Dry"}
				</span>
			)}
			{status && (
				<span
					role="status"
					className={clsx(
						"ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-xs font-semibold",
						STATUS_PILL[status.kind],
					)}
				>
					<Icon name="flag" size={14} strokeWidth={2.2} />
					{status.label}
				</span>
			)}
		</div>
	);
}

const BAR: { id: TabId; label: string; icon: IconName }[] = [
	{ id: "live", label: "Live", icon: "live" },
	{ id: "map", label: "Map", icon: "map" },
	{ id: "messages", label: "Messages", icon: "messages" },
	{ id: "strategy", label: "Strategy", icon: "strategy" },
];

// 60px bottom bar: Live · Map · Messages · Strategy · More (the rest lives in the More sheet).
export function MobileBottomBar() {
	return (
		<Suspense fallback={<BottomBar active={null} />}>
			<BottomBarFromUrl />
		</Suspense>
	);
}

function BottomBarFromUrl() {
	const pathname = usePathname();
	const tab = useSearchParams().get("tab");
	return <BottomBar active={pathname === "/dashboard" ? parseTab(tab) : null} />;
}

function BottomBar({ active }: { active: TabId | null }) {
	const [more, setMore] = useState(false);
	const moreButton = useRef<HTMLButtonElement>(null);
	const closeMore = useCallback(() => {
		setMore(false);
		moreButton.current?.focus();
	}, []);
	const inMore = active === "weather" || active === "standings";

	return (
		<>
			{more && <MoreSheet onClose={closeMore} />}
			<nav
				aria-label="Dashboard"
				className="fixed inset-x-0 bottom-0 z-40 grid h-[60px] grid-cols-5 border-t border-border bg-nav pb-[env(safe-area-inset-bottom)]"
			>
				{BAR.map((tab) => (
					<TabLink
						key={tab.id}
						href={tabHref(tab.id)}
						aria-current={tab.id === active ? "page" : undefined}
						className={clsx(
							"flex flex-col items-center justify-center gap-1 text-[11px]",
							tab.id === active ? "text-fg-1" : "text-fg-3",
						)}
					>
						<Icon name={tab.icon} size={20} />
						{tab.label}
					</TabLink>
				))}
				<button
					ref={moreButton}
					type="button"
					aria-expanded={more}
					onClick={() => setMore(true)}
					className={clsx(
						"flex cursor-pointer flex-col items-center justify-center gap-1 text-[11px]",
						inMore ? "text-fg-1" : "text-fg-3",
					)}
				>
					<span aria-hidden className="text-lg leading-5">
						•••
					</span>
					More
				</button>
			</nav>
		</>
	);
}

// The More sheet (MoreMobile.png): the tabs and pages that don't fit the bottom bar, and the delay.
function MoreSheet({ onClose }: { onClose: () => void }) {
	const weather = useDataStore((s) => s.state?.WeatherData);
	const dialog = useRef<HTMLDivElement>(null);

	// Focus moves into the sheet and Tab stays inside it until it closes.
	useEffect(() => {
		dialog.current?.focus();
		const onTab = (e: KeyboardEvent) => {
			if (e.key !== "Tab" || !dialog.current) return;
			const focusable = dialog.current.querySelectorAll<HTMLElement>("a[href], button, input");
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (!first || !last) return;
			if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onTab);
		return () => document.removeEventListener("keydown", onTab);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	const items: { href: string; title: string; hint: string }[] = [
		{
			href: tabHref("weather"),
			title: "Weather",
			hint: weather
				? `${Math.round(parseFloat(weather.TrackTemp))}° track · ${Math.round(parseFloat(weather.AirTemp))}° air · ${weather.Rainfall === "1" ? "Rain" : "Dry"}`
				: "Rain radar and conditions",
		},
		{ href: tabHref("standings"), title: "Standings", hint: "Championship, live projection" },
		{ href: "/schedule", title: "Schedule", hint: "This weekend and the rest of the season" },
		{ href: "/dashboard/settings", title: "Settings", hint: "Display, chime, followed drivers" },
		{ href: "/help", title: "Help", hint: "How to read the dashboard" },
	];

	return (
		<div className="fixed inset-0 z-50 bg-bg/70" onClick={onClose}>
			<div
				ref={dialog}
				role="dialog"
				aria-modal="true"
				aria-label="More"
				tabIndex={-1}
				className="absolute inset-x-0 bottom-[60px] flex flex-col gap-2.5 rounded-t-[18px] border-t border-border-subtle bg-surface-1 px-3 pt-2 pb-3.5 outline-none"
				onClick={(e) => e.stopPropagation()}
			>
				<span aria-hidden className="mx-auto mb-1 h-1 w-10 rounded-full bg-border-strong" />
				<ul className="flex flex-col">
					{items.map((item) => (
						<li key={item.href}>
							<TabLink
								href={item.href}
								onClick={onClose}
								className="flex min-h-12 flex-col justify-center rounded-control px-3 py-2 hover:bg-surface-2"
							>
								<span className="text-[15px] font-medium">{item.title}</span>
								<span className="text-xs text-fg-2">{item.hint}</span>
							</TabLink>
						</li>
					))}
				</ul>
				<div className="flex items-center gap-2.5 rounded-control border border-border px-3 py-2">
					<span className="flex-1 text-[13px] text-fg-2">Broadcast delay (s)</span>
					<DelayTimer />
					<DelayInput saveDelay={500} className="h-11 w-16 text-lg" />
				</div>
				<p className="px-1 text-center text-[11px] text-fg-3">pitwall · Fork of f1-dash · v{process.env.version}</p>
			</div>
		</div>
	);
}
