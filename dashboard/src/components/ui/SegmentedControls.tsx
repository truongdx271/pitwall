"use client";

import clsx from "clsx";

type Props<T> = {
	id?: string;
	className?: string;
	options: { label: string; value: T }[];
	selected: T;
	onSelect?: (val: T) => void;
};

export default function SegmentedControls<T>({ id, className, options, selected, onSelect }: Props<T>) {
	return (
		<div id={id} className={clsx("inline-flex gap-0.5 rounded-control bg-bg p-0.5", className)}>
			{options.map((option) => {
				const isActive = option.value === selected;
				return (
					<button
						type="button"
						key={String(option.label)}
						aria-pressed={isActive}
						onClick={() => onSelect?.(option.value)}
						className={clsx(
							"h-[30px] cursor-pointer rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fg-1",
							isActive ? "bg-surface-3 text-fg-1" : "text-fg-2 hover:text-fg-1",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
