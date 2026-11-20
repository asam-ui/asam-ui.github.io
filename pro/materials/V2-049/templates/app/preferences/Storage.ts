import type { Scope, StorageAdapter, Result } from './Types.js';
/** JSON tuple preserves types and field boundaries. Undefined/nonfinite numbers are rejected. */
export function encodeScope(scope: Scope): string {
	if (
		!Array.isArray(scope) ||
		!scope.every(
			(part) =>
				part === null ||
				typeof part === 'string' ||
				(typeof part === 'number' && Number.isFinite(part))
		)
	)
		throw new Error('Invalid scope');
	return JSON.stringify(scope);
}
export function storageKey(
	app: string,
	kind: 'preferences' | 'business',
	owner: Scope,
	scope: Scope = []
): string {
	if (!app) throw new Error('Missing application namespace');
	return JSON.stringify([
		'asam',
		app,
		kind,
		JSON.parse(encodeScope(owner)),
		JSON.parse(encodeScope(scope))
	]);
}
export function memoryStorage(): StorageAdapter {
	const data = new Map<string, string>();
	return {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => {
			data.set(key, value);
		},
		removeItem: (key) => {
			data.delete(key);
		}
	};
}
/** Access can itself throw (privacy mode); callers observe unavailable and continue in session. */
export function browserStorage(): StorageAdapter | undefined {
	try {
		return typeof window === 'undefined' ? undefined : window.localStorage;
	} catch {
		return undefined;
	}
}
export function readJson(storage: StorageAdapter | undefined, key: string): Result<unknown> {
	try {
		if (!storage) return { status: 'unavailable' };
		const text = storage.getItem(key);
		if (text === null) return { status: 'missing' };
		try {
			return { status: 'ok', value: JSON.parse(text) };
		} catch {
			return { status: 'invalid' };
		}
	} catch {
		return { status: 'unavailable' };
	}
}
export function record(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
