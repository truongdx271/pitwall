import type { ReactNode } from "react";
import clsx from "clsx";

type Props = {
	/** Panel heading; also labels the section for screen readers. */
	title?: string;
	/** Extra header content after the title: notes, legends, controls. */
	header?: ReactNode;
	className?: string;
	children: ReactNode;
};

// A surface-1 card with a 1px border and the panel radius (SPEC §3).
export default function Panel({ title, header, className, children }: Props) {
	return (
		<section
			aria-label={title}
			className={clsx(
				"flex min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-surface-1",
				className,
			)}
		>
			{(title || header) && (
				<div className="flex min-h-11 items-center gap-3 px-3 py-1.5">
					{title && <h2 className="text-sm font-semibold whitespace-nowrap text-fg-1">{title}</h2>}
					{header}
				</div>
			)}
			{children}
		</section>
	);
}
