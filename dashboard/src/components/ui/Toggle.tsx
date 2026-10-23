"use client";

import { Switch } from "@headlessui/react";

type Props = {
	enabled: boolean;
	setEnabled: (value: boolean) => void;
	label?: string;
};

// Switch from Settings.dc.html: 44 × 26 track, green when on.
export default function Toggle({ enabled, setEnabled, label }: Props) {
	return (
		<Switch
			checked={enabled}
			onChange={setEnabled}
			aria-label={label}
			className="group flex h-[26px] w-11 flex-none cursor-pointer rounded-full bg-[#2a3039] p-[3px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-1 data-checked:bg-personal-best"
		>
			<span className="block size-5 rounded-full bg-fg-2 transition-transform group-data-checked:translate-x-[18px] group-data-checked:bg-bg" />
		</Switch>
	);
}
