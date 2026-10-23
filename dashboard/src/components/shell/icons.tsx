import type { ReactNode } from "react";

// Line icons on a 24-unit grid, stroke-width 2, round caps and joins. Paths come from
// docs/redesign/source/Main.dc.html.
const PATHS = {
	live: (
		<>
			<circle cx="12" cy="13" r="8" />
			<path d="M12 9v4l2 2M10 2h4" />
		</>
	),
	map: (
		<>
			<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
			<path d="M9 4v14M15 6v14" />
		</>
	),
	messages: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
	strategy: (
		<>
			<path d="M12 3 2 8l10 5 10-5-10-5z" />
			<path d="m2 13 10 5 10-5" />
		</>
	),
	weather: <path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18z" />,
	standings: (
		<>
			<path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
			<path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8" />
		</>
	),
	schedule: (
		<>
			<rect x="3" y="5" width="18" height="16" rx="2" />
			<path d="M3 10h18M8 3v4M16 3v4" />
		</>
	),
	help: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
		</>
	),
	settings: (
		<>
			<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
			<circle cx="15" cy="6" r="2" />
			<circle cx="9" cy="12" r="2" />
			<circle cx="17" cy="18" r="2" />
		</>
	),
	thermometer: <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />,
	droplet: (
		<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
	),
	wind: <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2" />,
	flag: <path d="M5 22V4M5 4h13l-2.5 4.5L18 13H5" />,
	warning: <path d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01" />,
	refresh: <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

type Props = {
	name: IconName;
	size?: number;
	strokeWidth?: number;
	className?: string;
};

export default function Icon({ name, size = 16, strokeWidth = 2, className }: Props) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={className}
		>
			{PATHS[name]}
		</svg>
	);
}

export function LogoMark() {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
			<rect x="1" y="1" width="22" height="22" rx="6" className="fill-fg-1" />
			<path
				d="M8 8l4 4-4 4M13 16h4"
				fill="none"
				className="stroke-bg"
				strokeWidth="2.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
