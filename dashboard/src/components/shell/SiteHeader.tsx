"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import { LogoMark } from "./icons";

const LINKS = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/schedule", label: "Schedule" },
	{ href: "/help", label: "Help" },
];

// Top bar of the pages outside the dashboard (Home, Schedule, Help).
export default function SiteHeader() {
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-10 flex min-h-[52px] flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-bg/85 px-4 py-1 backdrop-blur-lg">
			<Link href="/" className="flex items-center gap-2 text-fg-1">
				<LogoMark />
				<span className="text-[15px] font-semibold tracking-[-0.01em]">pitwall</span>
			</Link>
			<nav aria-label="Site" className="flex gap-0.5">
				{LINKS.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						aria-current={pathname === link.href ? "page" : undefined}
						className={clsx(
							"flex h-9 items-center rounded-control px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fg-1",
							pathname === link.href ? "bg-surface-3 text-fg-1" : "text-fg-2 hover:text-fg-1",
						)}
					>
						{link.label}
					</Link>
				))}
			</nav>
			<div className="ml-auto flex items-center gap-2">
				<a
					href="https://github.com/ignaciohaffner/pitwall"
					target="_blank"
					className="hidden h-9 items-center rounded-control px-3 text-[13px] text-fg-2 hover:text-fg-1 sm:flex"
				>
					GitHub
				</a>
				<Link
					href="/dashboard"
					className="flex h-9 items-center rounded-control bg-fg-1 px-3.5 text-[13px] font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-1"
				>
					Open dashboard
				</Link>
			</div>
		</header>
	);
}
