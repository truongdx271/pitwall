import * as THREE from "three";

import { rotate } from "@/lib/map";
import { stackLabels } from "@/lib/map3d";
import { textOn } from "@/lib/color";

export type SceneInput = {
	x: number[];
	y: number[];
	// Metres, one per outline point; all zero without height data.
	z: number[];
	rotation: number;
	pit: [number, number, number][] | null;
	// Lap fraction where each marshal sector starts.
	sectorStarts: number[];
	corners: { number: number; x: number; y: number; angle: number; z: number }[];
};

export type View = "overview" | "low" | "top";
export type CarInfo = { tla: string; colour: string | undefined; followed: boolean };

const SAMPLES = 1400;
const FOV = 34;
const TRACK_HALF_WIDTH = 15; // outline band, metres: the 2D map's 300-wide stroke
const LINE_HALF_WIDTH = 3.5;
const FLAG_HALF_WIDTH = 7;
const PIT_HALF_WIDTH = 2.5;
const GROUND = -6; // metres below the lowest point, before exaggeration
const CORNER_LABEL_OFFSET = 480; // decimetres, as on the 2D map
const CAR_LIFT = 4; // metres above the track
const CHIP_LIFT = 30; // px from car to chip
const CAR_SMOOTHING = 8; // 1/s, only for real positions, which arrive about once a second

const COLOURS = {
	background: 0x0b0e12,
	gridMajor: 0x1f242c,
	gridMinor: 0x161a20,
	footprint: 0x1c222b,
	band: 0x323843,
	line: 0xeceef1,
	pit: 0x4da3ff,
	low: 0x24415f,
	high: 0x8fc4ff,
};

const VIEWS: Record<View, { yaw: number; pitch: number; zoom: number }> = {
	overview: { yaw: -0.5, pitch: 0.62, zoom: 1 },
	low: { yaw: -0.95, pitch: 0.2, zoom: 0.95 },
	top: { yaw: 0, pitch: 1.56, zoom: 0.95 },
};

type Car = {
	mesh: THREE.Mesh;
	material: THREE.MeshBasicMaterial;
	label: HTMLDivElement;
	chip: HTMLSpanElement;
	stem: HTMLElement;
	target: THREE.Vector3;
	snap: boolean;
	visible: boolean;
	pit: boolean;
	tla: string;
	colour: string | undefined;
};

function ribbon(
	points: THREE.Vector3[],
	normals: THREE.Vector3[],
	half: number,
	lift: number,
	closed: boolean,
	flat = false,
) {
	const count = points.length + (closed ? 1 : 0);
	const position = new Float32Array(count * 6);
	const index: number[] = [];
	for (let k = 0; k < count; k++) {
		const p = points[k % points.length];
		const n = normals[k % points.length];
		const y = flat ? lift : p.y + lift;
		position.set([p.x + n.x * half, y, p.z + n.z * half, p.x - n.x * half, y, p.z - n.z * half], k * 6);
		if (k < count - 1) index.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
	geometry.setIndex(index);
	return geometry;
}

function normalsOf(points: THREE.Vector3[], closed: boolean) {
	const n = points.length;
	return points.map((_, i) => {
		const a = closed ? points[(i + n - 1) % n] : points[Math.max(i - 1, 0)];
		const b = closed ? points[(i + 1) % n] : points[Math.min(i + 1, n - 1)];
		const d = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
		return new THREE.Vector3(-d.z, 0, d.x);
	});
}

// The Map tab's 3D view. Owns the renderer, camera and on-screen labels; Map3D.tsx feeds it.
export class TrackScene {
	private renderer: THREE.WebGLRenderer;
	private scene = new THREE.Scene();
	private camera: THREE.PerspectiveCamera;
	private world = new THREE.Group();
	private grid: THREE.GridHelper;
	private labels: HTMLDivElement;
	private cars = new Map<string, Car>();
	private carGeometry = new THREE.SphereGeometry(1, 20, 14);
	private haloMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
	private order: string[] = [];
	private sectors: { thin: THREE.Mesh; wide: THREE.Mesh; material: THREE.MeshBasicMaterial }[] = [];
	private cornerEls: { el: HTMLDivElement; position: THREE.Vector3 }[] = [];
	private frame = 0;
	private last = performance.now();
	private exaggeration = 1;
	private aspect = 1.6;
	private view: View | null = "overview";
	private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	private camState = { yaw: 0, pitch: 1, dist: 1000, tx: 0, ty: 0, tz: 0 };
	private goal = { ...this.camState };
	private pointers = new Map<number, { x: number; y: number }>();
	private pinch = 0;
	private observer: ResizeObserver;
	private readonly span: number;
	private readonly spanX: number;
	private readonly spanZ: number;
	private readonly height: number;
	private readonly toWorld: (x: number, y: number, z: number) => THREE.Vector3;
	readonly heightRange: number;

	// Throws when WebGL is unavailable.
	constructor(
		private container: HTMLElement,
		input: SceneInput,
		private onViewChange: (view: View | null) => void,
	) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setClearColor(COLOURS.background);
		const canvas = this.renderer.domElement;
		canvas.className = "absolute inset-0 block";
		container.prepend(canvas);

		this.labels = document.createElement("div");
		this.labels.className = "pointer-events-none absolute inset-0 overflow-hidden";
		container.append(this.labels);

		// Same transform as the 2D map, so the top view lines up with it.
		const pivotX = (Math.max(...input.x) - Math.min(...input.x)) / 2;
		const pivotY = (Math.max(...input.y) - Math.min(...input.y)) / 2;
		const turn = (x: number, y: number) => rotate(x, y, input.rotation, pivotX, pivotY);
		const rotated = input.x.map((x, i) => turn(x, input.y[i]));
		const xs = rotated.map((p) => p.x);
		const ys = rotated.map((p) => p.y);
		const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
		const zMin = Math.min(...input.z);
		this.heightRange = Math.max(...input.z) - zMin;
		this.height = this.heightRange;
		this.spanX = (maxX - minX) / 10;
		this.spanZ = (maxY - minY) / 10;
		this.span = Math.max(this.spanX, this.spanZ);
		this.toWorld = (x, y, z) => {
			const r = turn(x, y);
			return new THREE.Vector3((r.x - (minX + maxX) / 2) / 10, z - zMin, (r.y - (minY + maxY) / 2) / 10);
		};

		this.camera = new THREE.PerspectiveCamera(FOV, 1, 5, this.span * 12);
		this.scene.add(this.world);
		this.grid = new THREE.GridHelper(
			this.span * 2.4,
			Math.max(2, Math.round((this.span * 2.4) / 100)),
			COLOURS.gridMajor,
			COLOURS.gridMinor,
		);
		this.scene.add(this.grid);

		this.buildTrack(input);
		this.buildPit(input.pit);
		this.buildCorners(input);

		this.observer = new ResizeObserver(() => this.resize());
		this.observer.observe(container);
		this.bindPointers(canvas);
		this.resize();
		this.setView("overview", true);
		this.frame = requestAnimationFrame(this.tick);
	}

	private buildTrack(input: SceneInput) {
		const raw = input.x.map((x, i) => this.toWorld(x, input.y[i], input.z[i]));
		const points = new THREE.CatmullRomCurve3(raw, true, "centripetal").getSpacedPoints(SAMPLES).slice(0, SAMPLES);
		const normals = normalsOf(points, true);

		// A curtain from track to ground is what makes the height readable.
		const position: number[] = [];
		const colour: number[] = [];
		const index: number[] = [];
		const low = new THREE.Color(COLOURS.low);
		const high = new THREE.Color(COLOURS.high);
		for (let k = 0; k <= SAMPLES; k++) {
			const p = points[k % SAMPLES];
			const c = low.clone().lerp(high, this.height ? p.y / this.height : 0);
			position.push(p.x, p.y, p.z, p.x, GROUND, p.z);
			colour.push(c.r, c.g, c.b, this.height ? 0.62 : 0, c.r, c.g, c.b, 0.04);
			if (k < SAMPLES) index.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
		}
		const curtain = new THREE.BufferGeometry();
		curtain.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
		curtain.setAttribute("color", new THREE.Float32BufferAttribute(colour, 4));
		curtain.setIndex(index);
		this.world.add(
			new THREE.Mesh(
				curtain,
				new THREE.MeshBasicMaterial({
					vertexColors: true,
					transparent: true,
					depthWrite: false,
					side: THREE.DoubleSide,
				}),
			),
		);

		const basic = (color: number) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
		this.world.add(
			new THREE.Mesh(ribbon(points, normals, TRACK_HALF_WIDTH, GROUND + 0.2, true, true), basic(COLOURS.footprint)),
		);
		const band = basic(COLOURS.band);
		band.polygonOffset = true;
		band.polygonOffsetFactor = 1;
		band.polygonOffsetUnits = 1;
		this.world.add(new THREE.Mesh(ribbon(points, normals, TRACK_HALF_WIDTH, 0.3, true), band));

		input.sectorStarts.forEach((start, i) => {
			const next = input.sectorStarts[(i + 1) % input.sectorStarts.length];
			const from = Math.round(start * SAMPLES) % SAMPLES;
			const to = Math.round(next * SAMPLES) % SAMPLES;
			const count = ((to - from + SAMPLES) % SAMPLES || SAMPLES) + 1;
			const slice = Array.from({ length: count }, (_, k) => points[(from + k) % SAMPLES]);
			const sliceNormals = Array.from({ length: count }, (_, k) => normals[(from + k) % SAMPLES]);
			const material = basic(COLOURS.line);
			const thin = new THREE.Mesh(ribbon(slice, sliceNormals, LINE_HALF_WIDTH, 0.7, false), basic(COLOURS.line));
			const wide = new THREE.Mesh(ribbon(slice, sliceNormals, FLAG_HALF_WIDTH, 0.8, false), material);
			wide.visible = false;
			this.world.add(thin, wide);
			this.sectors.push({ thin, wide, material });
		});

		// Chequered strip across the track at the lap start.
		const cv = document.createElement("canvas");
		cv.width = 96;
		cv.height = 16;
		const ctx = cv.getContext("2d");
		if (ctx) {
			for (let i = 0; i < 12; i++) {
				for (let j = 0; j < 2; j++) {
					ctx.fillStyle = (i + j) % 2 ? "#000" : "#fff";
					ctx.fillRect(i * 8, j * 8, 8, 8);
				}
			}
		}
		const texture = new THREE.CanvasTexture(cv);
		texture.magFilter = THREE.NearestFilter;
		const line = new THREE.Mesh(
			new THREE.PlaneGeometry(TRACK_HALF_WIDTH * 2, 6),
			new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
		);
		line.rotation.x = -Math.PI / 2;
		line.rotation.z = -Math.atan2(normals[0].z, normals[0].x);
		line.position.set(points[0].x, points[0].y + 1, points[0].z);
		this.world.add(line);
	}

	private buildPit(pit: SceneInput["pit"]) {
		if (!pit || pit.length < 2) return;
		const raw = pit.map(([x, y, z]) => this.toWorld(x, y, z));
		const points = new THREE.CatmullRomCurve3(raw, false, "centripetal").getSpacedPoints(300);
		const material = new THREE.MeshBasicMaterial({ color: COLOURS.pit, side: THREE.DoubleSide });
		this.world.add(new THREE.Mesh(ribbon(points, normalsOf(points, false), PIT_HALF_WIDTH, 0.5, false), material));
	}

	private buildCorners(input: SceneInput) {
		for (const corner of input.corners) {
			const a = (corner.angle * Math.PI) / 180;
			const p = this.toWorld(
				corner.x + CORNER_LABEL_OFFSET * Math.cos(a),
				corner.y + CORNER_LABEL_OFFSET * Math.sin(a),
				corner.z,
			);
			const el = document.createElement("div");
			el.className =
				"absolute top-[-10px] left-[-10px] grid size-5 place-items-center rounded-full border border-border-strong bg-surface-1 text-[10.5px] font-semibold text-fg-1";
			el.textContent = String(corner.number);
			el.hidden = true;
			this.labels.append(el);
			this.cornerEls.push({ el, position: p });
		}
	}

	private fitDistance() {
		const half = (FOV * Math.PI) / 360;
		return (Math.max(this.spanX / this.aspect, this.spanZ) * 0.5 * 1.28) / Math.tan(half);
	}

	private resize() {
		const { width, height } = this.container.getBoundingClientRect();
		if (!width || !height) return;
		this.aspect = width / height;
		this.renderer.setSize(width, height);
		this.camera.aspect = this.aspect;
		this.camera.updateProjectionMatrix();
		if (this.view) this.setView(this.view, false);
	}

	setView(view: View, instant = false) {
		this.view = view;
		const v = VIEWS[view];
		Object.assign(this.goal, {
			yaw: v.yaw,
			pitch: v.pitch,
			dist: this.fitDistance() * v.zoom,
			tx: 0,
			tz: 0,
			ty: (this.height / 2) * this.exaggeration,
		});
		if (instant || this.reduced) Object.assign(this.camState, this.goal);
	}

	setExaggeration(value: number) {
		this.exaggeration = value;
		this.world.scale.y = value;
		this.grid.position.y = GROUND * value;
		this.goal.ty = (this.height / 2) * value;
	}

	setSectorColours(colour: (index: number) => string | null) {
		this.sectors.forEach((sector, i) => {
			const c = colour(i);
			sector.thin.visible = !c;
			sector.wide.visible = !!c;
			if (c) sector.material.color.set(c);
		});
	}

	setCornersVisible(visible: boolean) {
		this.cornerEls.forEach(({ el }) => (el.hidden = !visible));
	}

	// Leader first: the order labels claim their spots in.
	setOrder(order: string[]) {
		this.order = order;
	}

	setCar(nr: string, info: CarInfo) {
		let car = this.cars.get(nr);
		if (!car) {
			const material = new THREE.MeshBasicMaterial();
			const mesh = new THREE.Mesh(this.carGeometry, material);
			const halo = new THREE.Mesh(this.carGeometry, this.haloMaterial);
			halo.scale.setScalar(1.28);
			mesh.add(halo);
			mesh.visible = false;
			this.scene.add(mesh);
			const label = document.createElement("div");
			label.className = "absolute top-0 left-0";
			label.hidden = true;
			const chip = document.createElement("span");
			chip.className = "block w-[34px] rounded-tag text-center text-[10.5px] leading-[15px] font-bold";
			const stem = document.createElement("i");
			stem.className = "absolute top-[15px] left-[16.5px] w-px bg-fg-2 opacity-55";
			label.append(chip, stem);
			this.labels.append(label);
			car = {
				mesh,
				material,
				label,
				chip,
				stem,
				target: new THREE.Vector3(),
				snap: true,
				visible: false,
				pit: false,
				tla: "",
				colour: undefined,
			};
			this.cars.set(nr, car);
		}
		if (car.tla !== info.tla) {
			car.tla = info.tla;
			car.chip.textContent = info.tla;
		}
		if (car.colour !== info.colour) {
			car.colour = info.colour;
			car.material.color.set(info.colour ? `#${info.colour}` : "#7c838f");
			car.chip.style.background = info.colour ? `#${info.colour}` : "var(--color-surface-3)";
			car.chip.style.color = textOn(info.colour);
		}
		car.chip.style.boxShadow = info.followed ? "0 0 0 1.5px var(--color-fg-1)" : "0 0 0 1px #000";
	}

	hideCar(nr: string) {
		const car = this.cars.get(nr);
		if (!car) return;
		car.visible = false;
		car.mesh.visible = false;
		car.label.hidden = true;
	}

	// x, y in feed coordinates, z in metres. `smooth` tweens towards it (real positions).
	placeCar(nr: string, x: number, y: number, z: number, pit: boolean, smooth = false) {
		const car = this.cars.get(nr);
		if (!car) return;
		const p = this.toWorld(x, y, z);
		car.target.copy(p);
		car.snap = car.snap || !car.visible || !smooth;
		car.pit = pit;
		car.visible = true;
		car.mesh.visible = true;
		car.label.hidden = false;
	}

	private tick = (now: number) => {
		const dt = Math.min((now - this.last) / 1000, 0.25);
		this.last = now;

		const blend = this.reduced ? 1 : 1 - Math.pow(0.002, dt);
		const cam = this.camState;
		for (const key of Object.keys(cam) as (keyof typeof cam)[]) cam[key] += (this.goal[key] - cam[key]) * blend;
		const flat = Math.cos(cam.pitch);
		this.camera.position.set(
			cam.tx + cam.dist * flat * Math.sin(cam.yaw),
			cam.ty + cam.dist * Math.sin(cam.pitch),
			cam.tz + cam.dist * flat * Math.cos(cam.yaw),
		);
		this.camera.lookAt(cam.tx, cam.ty, cam.tz);
		this.camera.updateMatrixWorld();

		const size = Math.max(8, cam.dist * 0.0062);
		const tween = 1 - Math.exp(-CAR_SMOOTHING * dt);
		const desired = new THREE.Vector3();
		this.cars.forEach((car) => {
			if (!car.visible) return;
			desired.set(car.target.x, car.target.y * this.exaggeration + CAR_LIFT, car.target.z);
			if (car.snap) car.mesh.position.copy(desired);
			else car.mesh.position.lerp(desired, tween);
			car.snap = false;
			car.mesh.scale.setScalar(car.pit ? size * 0.55 : size);
		});

		this.renderer.render(this.scene, this.camera);
		this.drawLabels();
		this.frame = requestAnimationFrame(this.tick);
	};

	private drawLabels() {
		const w = this.container.clientWidth / 2;
		const h = this.container.clientHeight / 2;
		const v = new THREE.Vector3();

		const shown: { car: Car; x: number; y: number }[] = [];
		const ordered = [
			...this.order.filter((nr) => this.cars.has(nr)),
			...Array.from(this.cars.keys()).filter((nr) => !this.order.includes(nr)),
		];
		// Pit cars go last: running cars keep the clear spots.
		const queue = ordered.map((nr) => this.cars.get(nr) as Car).filter((car) => car.visible);
		queue.sort((a, b) => Number(a.pit) - Number(b.pit));
		for (const car of queue) {
			v.copy(car.mesh.position).project(this.camera);
			shown.push({ car, x: (v.x + 1) * w, y: (1 - v.y) * h });
		}
		const boxes = stackLabels(shown.map((s) => ({ x: s.x, y: s.y - CHIP_LIFT })));
		shown.forEach(({ car, x, y }, i) => {
			const box = boxes[i];
			car.label.style.opacity = car.pit ? "0.55" : "1";
			car.label.style.transform = `translate(${(x - 17).toFixed(1)}px, ${box.y.toFixed(1)}px)`;
			car.stem.style.height = `${Math.max(0, y - box.y - 21).toFixed(1)}px`;
		});

		for (const { el, position } of this.cornerEls) {
			if (el.hidden) continue;
			v.set(position.x, position.y * this.exaggeration + 6, position.z).project(this.camera);
			el.style.transform = `translate(${((v.x + 1) * w).toFixed(1)}px, ${((1 - v.y) * h).toFixed(1)}px)`;
		}
	}

	private leaveView() {
		if (this.view) {
			this.view = null;
			this.onViewChange(null);
		}
	}

	private clampDistance(d: number) {
		return Math.min(this.span * 5, Math.max(70, d));
	}

	private pan(dx: number, dy: number) {
		const k = this.goal.dist / (this.container.clientHeight || 600);
		const s = Math.sin(this.goal.yaw);
		const c = Math.cos(this.goal.yaw);
		this.goal.tx += (-dx * c - dy * s) * k;
		this.goal.tz += (dx * s - dy * c) * k;
	}

	private bindPointers(canvas: HTMLCanvasElement) {
		canvas.style.touchAction = "none";
		canvas.style.cursor = "grab";
		canvas.addEventListener("pointerdown", (e) => {
			canvas.setPointerCapture(e.pointerId);
			this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
			this.pinch = 0;
			canvas.style.cursor = "grabbing";
		});
		canvas.addEventListener("pointermove", (e) => {
			const p = this.pointers.get(e.pointerId);
			if (!p) return;
			const dx = e.clientX - p.x;
			const dy = e.clientY - p.y;
			p.x = e.clientX;
			p.y = e.clientY;
			this.leaveView();
			if (this.pointers.size === 2) {
				const [a, b] = Array.from(this.pointers.values());
				const d = Math.hypot(a.x - b.x, a.y - b.y);
				if (this.pinch) this.goal.dist = this.clampDistance((this.goal.dist * this.pinch) / d);
				this.pinch = d;
				this.pan(dx / 2, dy / 2);
			} else if (e.shiftKey || e.buttons === 2) {
				this.pan(dx, dy);
			} else {
				this.goal.yaw -= dx * 0.005;
				this.goal.pitch = Math.min(1.56, Math.max(0.06, this.goal.pitch + dy * 0.004));
			}
		});
		const end = (e: PointerEvent) => {
			this.pointers.delete(e.pointerId);
			this.pinch = 0;
			if (!this.pointers.size) canvas.style.cursor = "grab";
		};
		canvas.addEventListener("pointerup", end);
		canvas.addEventListener("pointercancel", end);
		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
		canvas.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				this.leaveView();
				this.goal.dist = this.clampDistance(this.goal.dist * Math.exp(e.deltaY * 0.001));
			},
			{ passive: false },
		);
	}

	dispose() {
		cancelAnimationFrame(this.frame);
		this.observer.disconnect();
		this.scene.traverse((object) => {
			const mesh = object as THREE.Mesh;
			mesh.geometry?.dispose();
			const material = mesh.material as THREE.Material | undefined;
			material?.dispose?.();
		});
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		this.renderer.domElement.remove();
		this.labels.remove();
	}
}
