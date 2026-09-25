"use client";

import { useEffect } from "react";

type Props = {
	onClose: () => void;
};

export default function QualiHelpModal({ onClose }: Props) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
			<div
				className="w-full max-w-2xl overflow-y-auto rounded-none border border-zinc-700 bg-black font-mono text-sm text-zinc-300 shadow-2xl"
				style={{ maxHeight: "90vh" }}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2">
					<span className="text-[11px] tracking-widest text-zinc-500 uppercase">qualifying mode — help</span>
					<button
						onClick={onClose}
						className="text-lg leading-none text-zinc-600 hover:text-zinc-300"
						aria-label="Close"
					>
						✕
					</button>
				</div>

				<div className="space-y-5 p-4">
					{/* Layout overview */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">columnas</div>
						<div className="space-y-1 text-zinc-400">
							<Row label="POS" desc="Posición en la clasificación según mejor vuelta." />
							<Row label="GAP" desc="Diferencia con el líder (pole). LEADER = P1." />
							<Row
								label="BEST"
								desc="Mejor vuelta completa del piloto en la sesión."
								accent="violet"
								accentText="violeta = vuelta más rápida de todos"
							/>
							<Row
								label="LAST"
								desc="Última vuelta completada."
								accent="emerald"
								accentText="verde = PB de vuelta · violeta = la más rápida de todos"
							/>
							<Row label="S1 / S2 / S3" desc="Columnas de sector (ver detalle abajo)." />
							<Row label="TYRE" desc="Compuesto actual. Número = vueltas en ese set." />
						</div>
					</section>

					{/* Sector column detail */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">
							cada columna de sector (S1, S2, S3)
						</div>

						<div className="border border-zinc-800 p-3 text-zinc-400">
							<div className="mb-3 flex flex-col gap-[3px]">
								<span className="text-zinc-300">20.600</span>
								<span className="text-[11px] text-zinc-600">
									<span className="text-zinc-500">████████</span> <span className="text-zinc-400">26.755</span>{" "}
									<span className="text-red-500">+6.155</span>
								</span>
							</div>

							<div className="space-y-1 text-[12px]">
								<p>
									<span className="text-zinc-300">Línea 1 (grande)</span>
									{" — "}mejor sector personal del piloto en la sesión. Referencia fija.
								</p>
								<p>
									<span className="text-zinc-300">Línea 2 (chica)</span>
									{" — "}lo que está pasando en la vuelta actual:
								</p>
								<ul className="ml-3 space-y-0.5 text-zinc-500">
									<li>
										<span className="text-amber-400">████</span> barras = piloto transitando ese sector ahora
									</li>
									<li>número = tiempo del sector completado en esta vuelta</li>
									<li>
										<span className="text-red-500">+X.XXX</span> = cuánto más lento que su mejor en ese sector
									</li>
									<li>
										<span className="text-emerald-400">−X.XXX</span> = está mejorando su mejor sector (PB en ruta)
									</li>
								</ul>
							</div>
						</div>
					</section>

					{/* Sector bar colors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">
							colores de las barras de minisector (█)
						</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow
								color="text-violet-400"
								char="█"
								label="VIOLETA"
								desc="Más rápido de todos los pilotos en ese minisector"
							/>
							<ColorRow
								color="text-emerald-400"
								char="█"
								label="VERDE"
								desc="Mejor personal del piloto en ese minisector"
							/>
							<ColorRow
								color="text-amber-400"
								char="█"
								label="AMARILLO"
								desc="En tiempo, sin comparación (mismo paso que su mejor)"
							/>
							<ColorRow color="text-blue-400" char="█" label="AZUL" desc="Vuelta de entrada o salida de pits" />
							<ColorRow color="text-zinc-700" char="▒" label="GRIS" desc="Minisector aún no recorrido" />
						</div>
					</section>

					{/* Lap time colors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">colores de tiempos</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow
								color="text-violet-400"
								char="1:12.578"
								label=""
								desc="Vuelta / sector más rápido de la sesión (overall fastest)"
							/>
							<ColorRow color="text-emerald-400" char="20.547" label="" desc="Mejor personal (personal fastest)" />
							<ColorRow color="text-zinc-300" char="26.755" label="" desc="Tiempo normal de esta vuelta" />
							<ColorRow color="text-zinc-700" char="29.081" label="" desc="Tiempo de una vuelta anterior (sin delta)" />
						</div>
					</section>

					{/* Session parts */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">partes de la sesión</div>
						<div className="space-y-1 text-[12px] text-zinc-400">
							<p>
								<span className="text-zinc-200">Q1</span> — 22 pilotos, eliminan los 6 más lentos (16 pasan)
							</p>
							<p>
								<span className="text-zinc-200">Q2</span> — 16 pilotos, eliminan los 6 más lentos (10 pasan)
							</p>
							<p>
								<span className="text-zinc-200">Q3</span> — 10 pilotos pelean por la pole position
							</p>
							<p className="text-zinc-600">Los pilotos eliminados aparecen con opacidad reducida.</p>
						</div>
					</section>

					{/* Tyre legend */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">neumáticos</div>
						<div className="space-y-1 text-[12px]">
							<TyreRow bg="bg-red-500" char="S" label="SOFT" desc="Blando — rojo" />
							<TyreRow bg="bg-yellow-300" char="M" label="MEDIUM" desc="Medio — amarillo" />
							<TyreRow bg="bg-zinc-100" char="H" label="HARD" desc="Duro — blanco" />
							<TyreRow bg="bg-green-500" char="I" label="INTERMEDIATE" desc="Intermedio — verde" />
							<TyreRow bg="bg-blue-500" char="W" label="WET" desc="Full wet — azul" />
						</div>
						<p className="mt-1 text-[11px] text-zinc-700">
							El número tras la letra indica vueltas en ese set. * = neumático usado.
						</p>
					</section>

					{/* Tip */}
					<div className="border-t border-zinc-800 pt-3 text-[11px] text-zinc-600">
						TIP: las barras de minisector se actualizan en tiempo real — si están en verde el piloto viene más rápido
						que su mejor en ese minisector.
					</div>
				</div>
			</div>
		</div>
	);
}

function Row({
	label,
	desc,
	accent,
	accentText,
}: {
	label: string;
	desc: string;
	accent?: string;
	accentText?: string;
}) {
	return (
		<div className="flex gap-3 text-[12px]">
			<span className="w-[8ch] shrink-0 text-zinc-300">{label}</span>
			<span className="text-zinc-500">
				{desc}
				{accentText && (
					<>
						{" "}
						<span className={accent === "violet" ? "text-violet-400" : "text-emerald-400"}>({accentText})</span>
					</>
				)}
			</span>
		</div>
	);
}

function ColorRow({ color, char, label, desc }: { color: string; char: string; label: string; desc: string }) {
	return (
		<div className="flex items-baseline gap-3">
			<span className={`w-[8ch] shrink-0 tabular-nums ${color}`}>{char}</span>
			<span className="text-zinc-500">
				{label && <span className="mr-1 text-zinc-400">{label}</span>}
				{desc}
			</span>
		</div>
	);
}

function TyreRow({ bg, char, label, desc }: { bg: string; char: string; label: string; desc: string }) {
	return (
		<div className="flex items-baseline gap-3">
			<span className="w-[8ch] shrink-0">
				<span className={`px-[0.3ch] font-bold text-black ${bg}`}>{char} 0</span>
			</span>
			<span className="text-zinc-500">
				<span className="mr-1 text-zinc-400">{label}</span>
				{desc}
			</span>
		</div>
	);
}
