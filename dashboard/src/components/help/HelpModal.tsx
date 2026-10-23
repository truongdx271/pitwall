"use client";

import { useEffect } from "react";
import Link from "next/link";

import HelpContent from "./HelpContent";

// The legend behind the top bar's Help button: the same content as /help.
export default function HelpModal({ onClose }: { onClose: () => void }) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-xs"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="How to read Pitwall"
				className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-panel border border-border bg-surface-1"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
					<h2 className="text-[15px] font-semibold">How to read Pitwall</h2>
					<Link href="/help" className="text-xs text-fg-2 hover:text-fg-1" onClick={onClose}>
						Open the full page
					</Link>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close help"
						className="ml-auto flex size-8 cursor-pointer items-center justify-center rounded-control text-fg-2 hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
					>
						✕
					</button>
				</div>
				<div className="overflow-y-auto p-5">
					<HelpContent compact />
				</div>
			</div>
		</div>
	);
}
