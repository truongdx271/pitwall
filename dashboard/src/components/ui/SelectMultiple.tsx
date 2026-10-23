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
	selected: T[];
	setSelected: (value: T[]) => void;
};

export default function SelectMultiple<T>({ placeholder, options, selected, setSelected }: Props<T>) {
	const [query, setQuery] = useState("");

	const filteredOptions =
		query === "" ? options : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

	return (
		<Combobox value={selected} onChange={(value) => setSelected(value)} onClose={() => setQuery("")} multiple>
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
				<ComboboxButton className="absolute inset-y-0 right-0 px-2.5 text-xs text-fg-3">▾</ComboboxButton>
			</div>

			<ComboboxOptions
				anchor="bottom"
				className={clsx(
					"z-50 mt-1 w-[var(--input-width)] rounded-control border border-border-subtle bg-surface-2 p-1 [--anchor-gap:var(--spacing-1)] empty:invisible",
					"transition duration-100 ease-in data-leave:data-closed:opacity-0",
				)}
			>
				{filteredOptions.slice(0, 5).map((option, idx) => (
					<ComboboxOption
						key={idx}
						value={option.value}
						className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-fg-2 select-none data-focus:bg-surface-3 data-focus:text-fg-1 data-selected:text-fg-1"
					>
						{option.label}
					</ComboboxOption>
				))}
			</ComboboxOptions>
		</Combobox>
	);
}
