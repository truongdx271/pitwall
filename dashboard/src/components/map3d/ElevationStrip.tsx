import { useEffect, useRef } from "react";

export type StripCar = { fraction: number; colour: string | undefined };

type Props = {
	// [lap fraction, metres], in lap order.
	profile: [number, number][];
	corners: { number: number; fraction: number }[];
	getCars: () => StripCar[];
};

const REFRESH_MS = 250;
const LEFT = 44;
const RIGHT = 14;
const TOP = 20;
const BOTTOM = 8;

// Track height around the lap, to scale in metres, with the cars on it.
export default function ElevationStrip({ profile, corners, getCars }: Props) {
	const canvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const node = canvas.current;
		const ctx = node?.getContext("2d");
		if (!node || !ctx) return;

		const heights = profile.map(([, m]) => m);
		const low = Math.min(...heights);
		const high = Math.max(...heights);
		const step = high - low > 60 ? 20 : high - low > 25 ? 10 : high - low > 10 ? 5 : 2;
		const ticks: number[] = [];
		for (let m = Math.ceil(low / step) * step; m <= high; m += step) ticks.push(m);

		const style = getComputedStyle(node);
		const token = (name: string) => style.getPropertyValue(name).trim();
		const [grid, muted] = [token("--color-border-subtle"), token("--color-fg-3")];

		const draw = () => {
			const { width, height } = node.getBoundingClientRect();
			if (!width || !height) return;
			const dpr = Math.min(window.devicePixelRatio, 2);
			if (node.width !== Math.round(width * dpr)) {
				node.width = Math.round(width * dpr);
				node.height = Math.round(height * dpr);
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, width, height);

			const w = width - LEFT - RIGHT;
			const h = height - TOP - BOTTOM;
			const X = (f: number) => LEFT + f * w;
			const Y = (m: number) => TOP + h - ((m - low) / (high - low || 1)) * h;

			ctx.font = "10.5px var(--font-geist-mono), monospace";
			ctx.textBaseline = "middle";
			ctx.textAlign = "right";
			ctx.lineWidth = 1;
			for (const m of ticks) {
				ctx.strokeStyle = grid;
				ctx.beginPath();
				ctx.moveTo(LEFT, Y(m));
				ctx.lineTo(LEFT + w, Y(m));
				ctx.stroke();
				ctx.fillStyle = muted;
				ctx.fillText(`${m} m`, LEFT - 6, Y(m));
			}

			const fill = ctx.createLinearGradient(0, TOP, 0, TOP + h);
			fill.addColorStop(0, "rgba(143,196,255,.32)");
			fill.addColorStop(1, "rgba(36,65,95,.02)");
			ctx.beginPath();
			ctx.moveTo(X(0), TOP + h);
			profile.forEach(([f, m]) => ctx.lineTo(X(f), Y(m)));
			ctx.lineTo(X(1), TOP + h);
			ctx.closePath();
			ctx.fillStyle = fill;
			ctx.fill();
			ctx.beginPath();
			profile.forEach(([f, m], i) => (i ? ctx.lineTo(X(f), Y(m)) : ctx.moveTo(X(f), Y(m))));
			ctx.strokeStyle = "#8fc4ff";
			ctx.lineWidth = 1.5;
			ctx.stroke();

			ctx.textAlign = "center";
			ctx.fillStyle = muted;
			for (const c of corners) ctx.fillText(String(c.number), X(c.fraction), 9);

			ctx.lineWidth = 1;
			ctx.strokeStyle = "#000";
			for (const car of getCars()) {
				const at = profile.findIndex(([f]) => f >= car.fraction);
				const m = profile[at === -1 ? profile.length - 1 : at][1];
				ctx.beginPath();
				ctx.arc(X(car.fraction), Y(m), 3.5, 0, Math.PI * 2);
				ctx.fillStyle = car.colour ? `#${car.colour}` : muted;
				ctx.fill();
				ctx.stroke();
			}
		};

		draw();
		const timer = setInterval(draw, REFRESH_MS);
		return () => clearInterval(timer);
	}, [profile, corners, getCars]);

	return (
		<canvas
			ref={canvas}
			aria-label="Track height around the lap, with car positions"
			className="block h-[92px] w-full shrink-0 border-t border-border"
		/>
	);
}
