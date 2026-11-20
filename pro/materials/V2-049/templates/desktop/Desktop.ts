import { computed, readonly, ref, shallowRef } from 'vue';
import { createBusinessCache } from '../app/preferences/Cache.js';
import { encodeScope } from '../app/preferences/Storage.js';
import type { Scope, StorageAdapter } from '../app/preferences/Types.js';
import type {
	DesktopOptions,
	DesktopPanel,
	DesktopWindow,
	LayoutSnapshot,
	LayoutStatus,
	WindowRect
} from './Types.js';

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const record = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
	Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const rectValid = (v: unknown): v is WindowRect =>
	record(v) &&
	exact(v, ['x', 'y', 'width', 'height']) &&
	Object.values(v).every(
		(n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100000
	) &&
	Number(v.width) > 0 &&
	Number(v.height) > 0;
export function validateLayout(v: unknown): v is LayoutSnapshot {
	if (
		!record(v) ||
		!exact(v, ['version', 'windows', 'active']) ||
		v.version !== 1 ||
		!Array.isArray(v.windows) ||
		v.windows.length > 32
	)
		return false;
	const ids = new Set<string>();
	for (const w of v.windows) {
		if (
			!record(w) ||
			!exact(w, ['id', 'rect', 'minimized', 'maximized']) ||
			typeof w.id !== 'string' ||
			!w.id ||
			w.id.length > 128 ||
			ids.has(w.id) ||
			!rectValid(w.rect) ||
			typeof w.minimized !== 'boolean' ||
			typeof w.maximized !== 'boolean'
		)
			return false;
		ids.add(w.id);
	}
	return (
		v.active === null ||
		(typeof v.active === 'string' &&
			ids.has(v.active) &&
			!v.windows.find((w) => w.id === v.active)?.minimized)
	);
}
export function clampRect(rect: WindowRect, width: number, height: number): WindowRect {
	const w = Math.max(1, width),
		h = Math.max(1, height);
	const rw = Math.min(w, Math.max(Math.min(280, w), rect.width));
	const rh = Math.min(h, Math.max(Math.min(180, h), rect.height));
	return {
		x: Math.max(0, Math.min(w - rw, rect.x)),
		y: Math.max(0, Math.min(h - rh, rect.y)),
		width: rw,
		height: rh
	};
}
function panelsCopy(input: readonly DesktopPanel[]): DesktopPanel[] {
	if (!Array.isArray(input) || input.length > 32) throw Error('At most 32 local panels');
	const ids = new Set<string>();
	return input.map((p) => {
		if (
			!p.id ||
			p.id.length > 128 ||
			ids.has(p.id) ||
			!p.title ||
			typeof p.allowed !== 'boolean'
		)
			throw Error('Invalid panel allowlist');
		ids.add(p.id);
		if (
			p.initial &&
			Object.values(p.initial).some((n) => typeof n !== 'number' || !Number.isFinite(n))
		)
			throw Error('Invalid initial rect');
		return copy(p);
	});
}
/** One instance owns layout only. The host owns business requests and child content. */
export function createDesktop(options: DesktopOptions) {
	if (!options.app) throw Error('Missing desktop application namespace');
	const panels = shallowRef(panelsCopy(options.panels));
	const windows = shallowRef<DesktopWindow[]>([]);
	const active = ref<string | null>(null);
	const viewport = ref({ width: 1100, height: 620 });
	const breakpoint = options.breakpoint ?? 720;
	if (!Number.isFinite(breakpoint) || breakpoint < 280) throw Error('Invalid breakpoint');
	const narrow = computed(() => viewport.value.width < breakpoint);
	const disabled = ref(options.disabled ?? false),
		readOnly = ref(options.readonly ?? false);
	const status = ref<LayoutStatus>('missing');
	const revision = ref(0),
		focusRevision = ref(0),
		contextRevision = ref(0);
	let owner = JSON.parse(encodeScope(options.owner)) as Scope;
	let scope = JSON.parse(encodeScope(options.scope)) as Scope;
	let epoch = 0,
		disposed = false,
		baseline: string | null | undefined;
	let baselineRevision = 0;
	function rememberBaseline(value: string | null | undefined) {
		baseline = value;
		baselineRevision++;
	}
	let writingEpoch: number | undefined;
	let writingContext: object | undefined;
	let writingBaseline: string | null | undefined,
		writeConflict = false;
	const guardedStorage: StorageAdapter | undefined = options.storage && {
		getItem: (key: string) => options.storage!.getItem(key),
		setItem: (key: string, value: string) => {
			const context = writingContext;
			if (disposed || writingEpoch !== epoch || context !== cache)
				throw Error('Stale layout write');
			const current = options.storage!.getItem(key);
			if (disposed || writingEpoch !== epoch || context !== cache)
				throw Error('Stale layout write');
			if (current !== writingBaseline) {
				writeConflict = true;
				throw Error('Layout conflict');
			}
			options.storage!.setItem(key, value);
			if (!disposed && context === cache) rememberBaseline(value);
		},
		removeItem: (key: string) => {
			const context = cache;
			options.storage!.removeItem(key);
			if (!disposed && context === cache) rememberBaseline(null);
		}
	};
	const cacheFor = () =>
		createBusinessCache<LayoutSnapshot>({
			app: `${options.app}/desktop-layout`,
			owner,
			scope,
			storage: guardedStorage,
			version: 1,
			ttl: options.ttl ?? 30 * 24 * 60 * 60 * 1000,
			now: options.now,
			validate: validateLayout
		});
	let cache = cacheFor();
	const visiblePanels = computed(() => panels.value.filter((p) => p.allowed));
	const panel = (id: string) => panels.value.find((p) => p.id === id && p.allowed);
	const allowed = (id: string) =>
		!disposed && !disabled.value && !readOnly.value && !!panel(id) && !panel(id)?.disabled;
	const raw = () => {
		try {
			return options.storage?.getItem(cache.key());
		} catch {
			return undefined;
		}
	};
	const touch = () => {
		epoch++;
		revision.value++;
	};
	function focus(id: string | null) {
		active.value = id;
		focusRevision.value++;
	}
	function fallback() {
		focus(windows.value.findLast((w) => !w.minimized)?.id ?? null);
	}
	function initialRect(p: DesktopPanel, i: number): WindowRect {
		return { x: 28 + i * 64, y: 26 + i * 52, width: 460, height: 330, ...p.initial };
	}
	function defaults() {
		windows.value = panels.value
			.filter((p) => p.allowed && p.initialOpen)
			.map((p, i) => ({
				id: p.id,
				rect: initialRect(p, i),
				minimized: false,
				maximized: false
			}));
		fallback();
	}
	function snapshot(): LayoutSnapshot {
		return copy({ version: 1, windows: windows.value, active: active.value });
	}
	function restoreSnapshot(value: LayoutSnapshot) {
		windows.value = copy(value.windows.filter((w) => !!panel(w.id)));
		focus(
			value.active && windows.value.some((w) => w.id === value.active && !w.minimized)
				? value.active
				: (windows.value.findLast((w) => !w.minimized)?.id ?? null)
		);
	}
	function open(id: string): boolean {
		if (!allowed(id)) return false;
		const existing = windows.value.find((w) => w.id === id);
		if (!existing)
			windows.value = [
				...windows.value,
				{
					id,
					rect: initialRect(
						panel(id)!,
						panels.value.findIndex((p) => p.id === id)
					),
					minimized: false,
					maximized: false
				}
			];
		return activate(id);
	}
	function activate(id: string): boolean {
		if (!allowed(id) || !windows.value.some((w) => w.id === id)) return false;
		const w = windows.value.find((w) => w.id === id)!;
		windows.value = [...windows.value.filter((w) => w.id !== id), { ...w, minimized: false }];
		touch();
		focus(id);
		return true;
	}
	function change(id: string, operation: 'close' | 'minimize' | 'maximize'): boolean {
		if (!allowed(id) || !windows.value.some((w) => w.id === id)) return false;
		if (operation === 'close') windows.value = windows.value.filter((w) => w.id !== id);
		else if (operation === 'minimize')
			windows.value = windows.value.map((w) => (w.id !== id ? w : { ...w, minimized: true }));
		else {
			const target = windows.value.find((w) => w.id === id)!;
			windows.value = [
				...windows.value.filter((w) => w.id !== id),
				{ ...target, minimized: false, maximized: !target.maximized }
			];
		}
		touch();
		if (operation === 'maximize') focus(id);
		else if (active.value === id) fallback();
		return true;
	}
	function setRect(id: string, value: WindowRect): boolean {
		if (!allowed(id) || narrow.value || !rectValid(value)) return false;
		const w = windows.value.find((w) => w.id === id);
		if (!w || w.maximized || w.minimized) return false;
		windows.value = windows.value.map((w) =>
			w.id === id
				? { ...w, rect: clampRect(value, viewport.value.width, viewport.value.height) }
				: w
		);
		touch();
		return true;
	}
	function displayRect(w: Readonly<DesktopWindow>): WindowRect {
		return narrow.value || w.maximized
			? { x: 0, y: 0, ...viewport.value }
			: clampRect(w.rect, viewport.value.width, viewport.value.height);
	}
	function setViewport(width: number, height: number) {
		if (
			disposed ||
			!Number.isFinite(width) ||
			!Number.isFinite(height) ||
			width <= 0 ||
			height <= 0
		)
			return;
		viewport.value = { width, height }; // Projection only; never rewrite saved desktop positions.
	}
	async function restore(beforeRead?: () => Promise<void>): Promise<LayoutStatus> {
		if (disposed) return 'disposed';
		const token = ++epoch;
		try {
			await beforeRead?.();
		} catch {
			if (disposed || token !== epoch) return 'stale';
			status.value = 'unavailable';
			return 'unavailable';
		}
		if (disposed || token !== epoch) return 'stale';
		const before = raw();
		if (disposed || token !== epoch) return 'stale';
		const result = cache.read('layout');
		// Storage adapters are host code: a getItem callback may reenter this controller.
		if (disposed || token !== epoch) return 'stale';
		const observed = raw();
		if (disposed || token !== epoch) return 'stale';
		if (before !== observed) return (status.value = 'conflict');
		rememberBaseline(observed);
		if (result.status === 'ok' && result.value) restoreSnapshot(result.value);
		else defaults();
		revision.value++;
		return (status.value = result.status);
	}
	async function save(beforeWrite?: () => Promise<void>): Promise<LayoutStatus> {
		if (disposed) return 'disposed';
		if (disabled.value || readOnly.value) return 'stale';
		const token = epoch,
			value = snapshot(),
			key = cache.key(),
			context = cache;
		try {
			await beforeWrite?.();
		} catch {
			if (disposed || token !== epoch || key !== cache.key()) return 'stale';
			return 'unavailable';
		}
		if (disposed || token !== epoch || key !== cache.key()) return 'stale';
		const observed = raw();
		if (disposed || token !== epoch) return 'stale';
		if (observed !== baseline) return (status.value = 'conflict');
		writingEpoch = token;
		writingContext = context;
		writingBaseline = observed;
		writeConflict = false;
		const result = context.write('layout', value);
		writingEpoch = undefined;
		writingContext = undefined;
		if (disposed || context !== cache || token !== epoch) return 'stale';
		if (writeConflict) return (status.value = 'conflict');
		const after = raw();
		if (disposed || context !== cache || token !== epoch || key !== cache.key()) return 'stale';
		if (result === 'ok' && after !== baseline)
			return (status.value = after === undefined ? 'unavailable' : 'conflict');
		return (status.value = result);
	}
	function reset(): LayoutStatus {
		if (disposed) return 'disposed';
		if (disabled.value || readOnly.value) return 'stale';
		touch();
		const token = epoch,
			key = cache.key(),
			context = cache;
		const result = context.clear();
		if (disposed || context !== cache || token !== epoch || key !== cache.key()) return 'stale';
		const after = raw();
		if (disposed || context !== cache || token !== epoch || key !== cache.key()) return 'stale';
		if (result === 'missing' && after !== baseline)
			return (status.value = after === undefined ? 'unavailable' : 'conflict');
		defaults();
		return (status.value = result);
	}
	function setContext(nextOwner: Scope, nextScope: Scope) {
		if (disposed) return;
		const o = JSON.parse(encodeScope(nextOwner)),
			s = JSON.parse(encodeScope(nextScope));
		if (
			JSON.stringify(o) === JSON.stringify(owner) &&
			JSON.stringify(s) === JSON.stringify(scope)
		)
			return;
		touch();
		contextRevision.value++;
		cache.dispose();
		owner = o;
		scope = s;
		cache = cacheFor();
		rememberBaseline(undefined);
		const context = cache;
		defaults();
		if (disposed || context !== cache) return;
		status.value = 'missing';
		const baselineToken = baselineRevision;
		const nextBaseline = raw();
		if (disposed || context !== cache) return;
		if (baselineRevision === baselineToken) rememberBaseline(nextBaseline);
	}
	function setPanels(next: readonly DesktopPanel[]) {
		if (disposed) return;
		panels.value = panelsCopy(next);
		touch();
		windows.value = windows.value.filter((w) => !!panel(w.id));
		if (!windows.value.some((w) => w.id === active.value && !w.minimized)) fallback();
	}
	function setPolicy(policy: { disabled?: boolean; readonly?: boolean }) {
		if (disposed) return;
		disabled.value = policy.disabled ?? false;
		readOnly.value = policy.readonly ?? false;
		touch();
	}
	function externalChange(key: string | null) {
		if (disposed || (key !== null && key !== cache.key())) return;
		const token = epoch,
			currentKey = cache.key();
		const observed = raw();
		if (disposed || token !== epoch || currentKey !== cache.key()) return;
		if (observed !== baseline) {
			touch();
			status.value = 'conflict';
		}
	}
	defaults();
	rememberBaseline(raw());
	return {
		panels: readonly(panels),
		visiblePanels: readonly(visiblePanels),
		windows: readonly(windows),
		active: readonly(active),
		viewport: readonly(viewport),
		narrow: readonly(narrow),
		disabled: readonly(disabled),
		readOnly: readonly(readOnly),
		status: readonly(status),
		revision: readonly(revision),
		focusRevision: readonly(focusRevision),
		contextRevision: readonly(contextRevision),
		open,
		activate,
		close: (id: string) => change(id, 'close'),
		minimize: (id: string) => change(id, 'minimize'),
		maximize: (id: string) => change(id, 'maximize'),
		setRect,
		displayRect,
		setViewport,
		setPanels,
		setPolicy,
		setContext,
		restore,
		save,
		reset,
		snapshot,
		externalChange,
		key: () => cache.key(),
		canOperate: allowed,
		dispose() {
			if (disposed) return;
			disposed = true;
			touch();
			cache.dispose();
			windows.value = [];
			active.value = null;
			status.value = 'disposed';
		}
	};
}
export type DesktopController = ReturnType<typeof createDesktop>;
