"use client";

import clsx from "clsx";

type Props = {
	className?: string;
	value: number;
	setValue: (value: number) => void;
};

export default function Slider({ value, setValue, className }: Props) {
	return (
		<input
			type="range"
			value={value}
			className={clsx("h-1 w-full cursor-pointer accent-fg-1", className)}
			onChange={(e) => setValue(Number(e.target.value))}
		/>
	);
}
