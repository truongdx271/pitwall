"use client";

import { useEffect } from "react";

type Props = {
	onClose: () => void;
};

export default function RaceHelpModal({ onClose }: Props) {
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
					<span className="text-[11px] tracking-widest text-zinc-500 uppercase">carrera — ayuda</span>
					<button
						onClick={onClose}
						className="text-lg leading-none text-zinc-600 hover:text-zinc-300"
						aria-label="Close"
					>
						✕
					</button>
				</div>

				<div className="space-y-5 p-4">
					{/* Column overview */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">columnas</div>
						<div className="space-y-1 text-zinc-400">
							<Row label="POS" desc="Posición actual en carrera + sigla del piloto con barra de color del equipo." />
							<Row label="TYRE" desc="Últimos 3 stints (del más viejo al actual): compuesto y vueltas en cada stint." />
							<Row label="INFO" desc="Estado del piloto (ver detalle abajo)." />
							<Row label="GAP" desc="Diferencia con el líder." />
							<Row label="INT" desc="Intervalo: diferencia con el auto de adelante. Verde = lo está alcanzando." />
							<Row label="LAP" desc="Última vuelta completada. Si no hay, muestra la mejor vuelta de la sesión." />
							<Row label="SECTORS" desc="Barras de minisector en tiempo real (ver detalle abajo)." />
							<Row
								label="PACE"
								desc="Ritmo promedio por stint, excluyendo vueltas de entrada/salida de pits (ver detalle abajo)."
							/>
						</div>
					</section>

					{/* INFO column */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">
							columna INFO — estado del piloto
						</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow
								color="text-violet-400"
								char="FL"
								desc="Fastest Lap — este piloto tiene la vuelta más rápida de la carrera."
							/>
							<ColorRow
								color="text-emerald-400"
								char="+N"
								desc="Ganó N posiciones respecto a su posición de largada."
							/>
							<ColorRow color="text-red-400" char="−N" desc="Perdió N posiciones respecto a su posición de largada." />
							<ColorRow color="text-zinc-600" char="NL" desc="Sin cambios de posición — muestra vueltas completadas." />
							<ColorRow color="text-cyan-400" char="PIT" desc="En boxes en este momento." />
							<ColorRow color="text-cyan-400" char="OUT" desc="Saliendo de boxes." />
							<ColorRow color="text-red-400" char="RET" desc="Retirado de la carrera." />
							<ColorRow color="text-red-400" char="STP" desc="Detenido en pista." />
						</div>
					</section>

					{/* PACE column */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">
							columna PACE — análisis de ritmo por stint
						</div>

						<div className="mb-3 border border-zinc-800 p-3 text-zinc-400">
							<div className="mb-2 flex items-baseline gap-4 text-[12px]">
								<span>
									<span className="font-bold text-red-400">S</span>
									<span className="text-zinc-500"> 1:15.4</span>
								</span>
								<span>
									<span className="font-bold text-yellow-300">M</span>
									<span className="text-zinc-300"> 1:16.2</span>
									<span className="text-red-500"> +0.04</span>
								</span>
							</div>
							<p className="text-[11px] text-zinc-600">
								Stint 1 en blando: promedio 1:15.4 · Stint actual en medio: promedio 1:16.2, degradando +0.04s por
								vuelta
							</p>
						</div>

						<div className="space-y-1 text-[12px]">
							<p className="text-zinc-400">
								<span className="text-zinc-300">Letra del compuesto</span>
								{" — "}en color del compuesto (ver neumáticos abajo).
							</p>
							<p className="text-zinc-400">
								<span className="text-zinc-300">Tiempo promedio</span>
								{" — "}media de las vueltas de ritmo del stint (excluye vuelta de salida de pits y vuelta de entrada).
								El stint actual aparece en <span className="text-zinc-200">blanco</span>, los pasados en{" "}
								<span className="text-zinc-500">gris</span>.
							</p>
							<p className="text-zinc-400">
								<span className="text-zinc-300">Degradación (+/−)</span>
								{" — "}cuántos segundos por vuelta está empeorando (o mejorando) el ritmo dentro del stint. Solo aparece
								si hay suficientes vueltas. <span className="text-red-500">Rojo</span> = degradación alta,{" "}
								<span className="text-emerald-500">verde</span> = mejorando.
							</p>
							<p className="mt-1 text-[11px] text-zinc-600">
								Si el piloto tiene pocas vueltas en el stint actual el promedio puede no ser representativo todavía.
							</p>
						</div>
					</section>

					{/* Sectors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">
							barras de minisector (SECTORS)
						</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow
								color="text-violet-400"
								char="█"
								desc="Más rápido de todos en ese minisector (overall fastest)."
							/>
							<ColorRow color="text-emerald-400" char="█" desc="Mejor personal del piloto en ese minisector." />
							<ColorRow color="text-amber-400" char="█" desc="En tiempo, sin comparación disponible." />
							<ColorRow color="text-blue-400" char="█" desc="Vuelta de entrada o salida de pits." />
							<ColorRow color="text-zinc-700" char="▒" desc="Minisector aún no recorrido en esta vuelta." />
						</div>
					</section>

					{/* Lap time colors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">colores de tiempos de vuelta</div>
						<div className="space-y-1 text-[12px]">
							<ColorRow color="text-violet-400" char="1:15.387" desc="Vuelta más rápida de la carrera (fastest lap)." />
							<ColorRow color="text-emerald-400" char="1:16.012" desc="Mejor vuelta personal del piloto." />
							<ColorRow color="text-zinc-300" char="1:17.540" desc="Vuelta normal de esta ronda." />
							<ColorRow
								color="text-zinc-600"
								char="1:18.201"
								desc="Mejor vuelta de la sesión (si no hay última vuelta)."
							/>
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
							El número tras la letra indica vueltas en ese set. pN = número de paradas.
						</p>
					</section>

					{/* Row highlight colors */}
					<section>
						<div className="mb-2 text-[11px] tracking-widest text-zinc-500 uppercase">color de fila</div>
						<div className="space-y-1 text-[12px] text-zinc-400">
							<p>
								<span className="text-violet-400">Violeta</span> — piloto con la vuelta más rápida de la carrera.
							</p>
							<p>
								<span className="text-sky-400">Azul</span> — piloto marcado como favorito en ajustes.
							</p>
							<p>
								<span className="text-zinc-600">Opacidad reducida</span> — piloto retirado, detenido o fuera de carrera.
							</p>
						</div>
					</section>

					<div className="border-t border-zinc-800 pt-3 text-[11px] text-zinc-600">
						TIP: hacé click en GAP para alternar entre diferencia al líder e intervalo con el auto de adelante.
					</div>
				</div>
			</div>
		</div>
	);
}

function Row({ label, desc }: { label: string; desc: string }) {
	return (
		<div className="flex gap-3 text-[12px]">
			<span className="w-[8ch] shrink-0 text-zinc-300">{label}</span>
			<span className="text-zinc-500">{desc}</span>
		</div>
	);
}

function ColorRow({ color, char, desc }: { color: string; char: string; desc: string }) {
	return (
		<div className="flex items-baseline gap-3">
			<span className={`w-[8ch] shrink-0 font-bold tabular-nums ${color}`}>{char}</span>
			<span className="text-zinc-500">{desc}</span>
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
