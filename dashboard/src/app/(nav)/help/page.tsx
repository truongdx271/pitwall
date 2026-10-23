import HelpContent, { HELP_SECTIONS } from "@/components/help/HelpContent";

export default function HelpPage() {
	return (
		<div className="flex gap-12 py-10">
			<nav aria-label="On this page" className="sticky top-20 hidden w-52 shrink-0 self-start lg:block">
				<p className="mb-2 px-2.5 text-[11px] font-semibold tracking-[0.08em] text-fg-3">ON THIS PAGE</p>
				<ul className="flex flex-col gap-0.5">
					{HELP_SECTIONS.map((s) => (
						<li key={s.id}>
							<a
								href={`#${s.id}`}
								className="flex h-9 items-center rounded-control px-2.5 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg-1"
							>
								{s.title}
							</a>
						</li>
					))}
				</ul>
			</nav>
			<div className="flex min-w-0 flex-1 flex-col gap-10">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-semibold tracking-[-0.02em]">How to read Pitwall</h1>
					<p className="max-w-2xl text-[15px] leading-relaxed text-fg-2">
						A reference for every column, colour and badge on the dashboard. The same legend opens from the help button
						in the top bar.
					</p>
				</div>
				<HelpContent />
			</div>
		</div>
	);
}
