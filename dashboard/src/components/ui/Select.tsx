"use client";

import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { useState } from "react";
import clsx from "clsx";

type Option<T> = {
	value: T;
	label: string;
};

type Props<T> = {
	placeholder?: string;

	options: Option<T>[];

	selected: T | null;
	setSelected: (value: T | null) => void;
};

export default function Select<T>({ placeholder, options, selected, setSelected }: Props<T>) {
	const [query, setQuery] = useState("");

	const selectedOption = options.find((option) => option.value === selected) ?? null;

	const filteredOptions =
		query === "" ? options : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

	return (
		<Combobox
			value={selectedOption}
			onChange={(option) => setSelected(option ? option.value : null)}
			onClose={() => setQuery("")}
		>
			<div className="relative">
				<ComboboxInput
					placeholder={placeholder}
					className={clsx(
						"h-[30px] w-full rounded-control border border-border-subtle bg-bg pr-8 pl-3 text-sm text-fg-1 placeholder:text-fg-3",
						"focus:border-border-strong focus:outline-none",
					)}
					displayValue={(option: Option<T> | null) => option?.label ?? ""}
					onChange={(event) => setQuery(event.target.value)}
				/>
				<ComboboxButton className="group absolute inset-y-0 right-0 px-2.5">
					{/* <ChevronDownIcon className="size-4 fill-white/60 group-data-hover:fill-white" /> */}
				</ComboboxButton>
			</div>

			<ComboboxOptions
				anchor="bottom"
				className={clsx(
					"w-[var(--input-width)] rounded-control border border-border-subtle bg-surface-2 p-1 [--anchor-gap:var(--spacing-1)] empty:invisible",
					"z-50 mt-1 transition duration-100 ease-in data-leave:data-closed:opacity-0",
				)}
			>
				{filteredOptions.map((option, idx) => (
					<ComboboxOption
						key={idx}
						value={option}
						className="group flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 select-none data-focus:bg-surface-3"
					>
						{/* <CheckIcon className="invisible size-4 fill-white group-data-selected:visible" /> */}
						<div className="text-sm text-fg-1">{option.label}</div>
					</ComboboxOption>
				))}
			</ComboboxOptions>
		</Combobox>
	);
}
