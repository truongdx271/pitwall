"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

type Props = {
	children: ReactNode;
	onClick?: () => void;
	className?: string;
};

export default function Button({ children, onClick, className }: Props) {
	return (
		<button
			type="button"
			className={clsx(
				"h-[30px] cursor-pointer rounded-md border border-border-subtle px-2.5 text-xs font-medium text-fg-2 transition-colors hover:border-border-strong hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1",
				className,
			)}
			onClick={onClick}
		>
			{children}
		</button>
	);
}
