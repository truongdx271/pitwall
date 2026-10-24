"use client";

import type { ComponentProps, MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Link to a dashboard tab. On /dashboard itself it only swaps the query with
// history.pushState (useSearchParams follows it): in the static export, Next
// 16.2's router sends any /dashboard?… it has not prefetched (Live, plain
// /dashboard) back to the URL the page was opened with, so Live never opened
// after loading ?tab=standings. Elsewhere it is a normal Link.
export default function TabLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
	const pathname = usePathname();

	const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
		onClick?.(e);
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		if (pathname !== "/dashboard" || new URL(href, window.location.href).pathname !== "/dashboard") return;
		e.preventDefault();
		if (window.location.pathname + window.location.search !== href) window.history.pushState(null, "", href);
	};

	return <Link href={href} onClick={handleClick} {...props} />;
}
