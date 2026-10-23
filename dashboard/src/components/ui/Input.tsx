"use client";

type Props = {
	value: string;
	setValue: (value: string) => void;
};

export default function Input({ value, setValue }: Props) {
	return (
		<input
			className="h-[30px] w-12 [appearance:textfield] rounded-md border border-border-subtle bg-bg px-1 text-center font-mono text-sm text-fg-1 tabular-nums focus:border-border-strong focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
			type="text"
			value={value}
			onChange={(e) => setValue(e.target.value)}
		/>
	);
}
