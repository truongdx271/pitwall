"use client";

import { Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";

import RaceHelpModal from "@/components/dashboard/RaceHelpModal";
import QualiHelpModal from "@/components/dashboard/QualiHelpModal";

import Icon, { LogoMark } from "./icons";
import LiveChip from "./LiveChip";
import { TABS, parseTab, tabHref, type TabId } from "./tabs";

type Props = {
	connected: boolean;
};

// 52px top bar (SPEC §2.1): logo, the six tabs, then Live chip, Schedule, Help, Settings.
export default function TopBar({ connected }: Props) {
	const hasSession = useDataStore((s) => !!s.state?.SessionInfo);
	const sessionName = useDataStore((s) => s.state?.SessionInfo?.Name ?? "");
	const [helpOpen, setHelpOpen] = useState(false);
	const isQuali = sessionName.toLowerCase().includes("qualifying");

	return (
		<header className="flex min-h-[52px] flex-wrap items-center gap-x-5 gap-y-1 border-b border-border px-4 py-1">
			{helpOpen &&
				(isQuali ? (
					<QualiHelpModal onClose={() => setHelpOpen(false)} />
				) : (
					<RaceHelpModal onClose={() => setHelpOpen(false)} />
				))}

			<Link href="/" className="flex items-center gap-2 text-fg-1">
				<LogoMark />
				<span className="text-[15px] font-semibold tracking-[-0.01em]">pitwall</span>
			</Link>

			<Suspense fallback={<TabNav active={null} />}>
				<TabNavFromUrl />
			</Suspense>

			<div className="ml-auto flex flex-wrap items-center gap-2">
				<LiveChip connected={connected} hasSession={hasSession} />

				<Link
					href="/schedule"
					className="flex h-9 items-center gap-2 rounded-control px-3 text-[13px] text-fg-2 transition-colors hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
				>
					<Icon name="schedule" />
					Schedule
				</Link>

				<button
					type="button"
					aria-label="Help and legend"
					onClick={() => setHelpOpen(true)}
					className="flex size-9 cursor-pointer items-center justify-center rounded-control text-fg-2 transition-colors hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
				>
					<Icon name="help" size={18} />
				</button>

				<SettingsLink />
			</div>
		</header>
	);
}

function SettingsLink() {
	const active = usePathname() === "/dashboard/settings";

	return (
		<Link
			href="/dashboard/settings"
			aria-label="Settings"
			aria-current={active ? "page" : undefined}
			className={clsx(
				"flex size-9 items-center justify-center rounded-control transition-colors focus-visible:outline-2 focus-visible:outline-fg-1",
				active ? "bg-surface-3 text-fg-1" : "text-fg-2 hover:text-fg-1",
			)}
		>
			<Icon name="settings" size={18} />
		</Link>
	);
}

function TabNavFromUrl() {
	const pathname = usePathname();
	const tab = useSearchParams().get("tab");

	// Only the dashboard page has tabs; on sub-pages (settings, driver) none is selected.
	return <TabNav active={pathname === "/dashboard" ? parseTab(tab) : null} />;
}

function TabNav({ active }: { active: TabId | null }) {
	return (
		<nav aria-label="Dashboard" className="no-scrollbar flex gap-0.5 overflow-x-auto">
			{TABS.map((tab) => {
				const selected = tab.id === active;
				return (
					<Link
						key={tab.id}
						href={tabHref(tab.id)}
						aria-current={selected ? "page" : undefined}
						className={clsx(
							"flex h-9 shrink-0 items-center gap-2 rounded-control px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fg-1",
							selected ? "bg-surface-3 text-fg-1" : "text-fg-2 hover:text-fg-1",
						)}
					>
						<Icon name={tab.icon} />
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
