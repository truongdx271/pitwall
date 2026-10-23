import clsx from "clsx";

type Props = {
	label: string;
	/** Text colour class, e.g. "text-pit". The dot takes the same colour. */
	color: string;
	className?: string;
};

// A 6px dot plus a label in the status colour, Geist 12/500 (SPEC §4).
export default function StatusDot({ label, color, className }: Props) {
	return (
		<span
			className={clsx(
				"inline-flex items-center gap-1.5 font-sans text-xs font-medium whitespace-nowrap",
				color,
				className,
			)}
		>
			<span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
			{label}
		</span>
	);
}
