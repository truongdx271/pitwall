import Link from "next/link";

// Site footer: the credit to f1-dash, the version and the trademark notice (SPEC §14).
export default function Footer() {
	return (
		<footer className="flex flex-col items-center gap-3 border-t border-border px-4 py-7 text-center">
			<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-fg-2">
				<span className="font-semibold text-fg-1">pitwall</span>
				<a className="hover:text-fg-1" target="_blank" href="https://github.com/ignaciohaffner/pitwall">
					GitHub
				</a>
				<Link className="hover:text-fg-1" href="/help">
					Help
				</Link>
				<a className="text-fg-3 hover:text-fg-1" target="_blank" href="https://github.com/slowlydev/f1-dash">
					Fork of f1-dash
				</a>
				<span className="font-mono text-fg-3">v{process.env.version}</span>
			</div>
			<p className="max-w-3xl text-[11px] leading-relaxed text-fg-3">
				Unofficial project, not associated with the Formula 1 companies. F1, Formula One, Formula 1, FIA Formula One
				World Championship, Grand Prix and related marks are trademarks of Formula One Licensing B.V.
			</p>
		</footer>
	);
}
