import { readonly, ref, shallowRef } from 'vue';
import type { Scope, StorageAdapter, StorageStatus, Result } from './Types.js';
import { storageKey, record, readJson, encodeScope } from './Storage.js';
export interface CacheOptions<T> {
	app: string;
	owner: Scope;
	scope: Scope;
	storage?: StorageAdapter;
	version: number;
	ttl: number;
	validate: (value: unknown) => value is T;
	now?: () => number;
}
/** One envelope per scope; clear never enumerates or clears another owner's storage. */
export function createBusinessCache<T>(options: CacheOptions<T>) {
	if (
		!Number.isInteger(options.version) ||
		options.version < 1 ||
		!Number.isFinite(options.ttl) ||
		options.ttl <= 0
	)
		throw new Error('Invalid cache schema/TTL');
	const now = options.now ?? Date.now;
	let scope: Scope = JSON.parse(encodeScope(options.scope));
	const owner: Scope = JSON.parse(encodeScope(options.owner));
	let generation = 0;
	let disposed = false;
	const value = shallowRef<T>();
	const status = ref<StorageStatus>('missing');
	const key = () => storageKey(options.app, 'business', owner, scope);
	type Entry = { version: number; owner: string; expires: number; data: Record<string, T> };
	function load(): Result<Entry> {
		const result = readJson(options.storage, key());
		if (result.status !== 'ok') return { status: result.status };
		const entry = result.value;
		if (!record(entry) || entry.owner !== key() || !Number.isInteger(entry.version))
			return { status: 'invalid' };
		if (Number(entry.version) > options.version) return { status: 'future' };
		if (
			entry.version !== options.version ||
			typeof entry.expires !== 'number' ||
			!Number.isFinite(entry.expires) ||
			!record(entry.data) ||
			!Object.values(entry.data).every(options.validate)
		)
			return { status: 'invalid' };
		if (entry.expires <= now()) return { status: 'expired' };
		return { status: 'ok', value: entry as Entry };
	}
	function read(name: string): Result<T> {
		value.value = undefined;
		if (disposed) return { status: (status.value = 'disposed') };
		const loaded = load();
		status.value = loaded.status;
		if (!loaded.value) return { status: loaded.status };
		if (!Object.hasOwn(loaded.value.data, name)) return { status: (status.value = 'missing') };
		value.value = loaded.value.data[name];
		return { status: (status.value = 'ok'), value: value.value };
	}
	function write(name: string, data: T): StorageStatus {
		if (disposed) return (status.value = 'disposed');
		if (!options.validate(data)) return (status.value = 'invalid');
		const loaded = load();
		if (['future', 'invalid', 'unavailable'].includes(loaded.status))
			return (status.value = loaded.status);
		const entries = { ...loaded.value?.data, [name]: data };
		try {
			if (!options.storage) return (status.value = 'unavailable');
			options.storage.setItem(
				key(),
				JSON.stringify({
					version: options.version,
					owner: key(),
					expires: now() + options.ttl,
					data: entries
				})
			);
			value.value = data;
			return (status.value = 'ok');
		} catch {
			return (status.value = 'unavailable');
		}
	}
	function clear() {
		generation++;
		value.value = undefined;
		if (disposed) return (status.value = 'disposed');
		try {
			if (!options.storage) return (status.value = 'unavailable');
			options.storage.removeItem(key());
			return (status.value = 'missing');
		} catch {
			return (status.value = 'unavailable');
		}
	}
	return {
		value: readonly(value),
		status: readonly(status),
		key,
		read,
		write,
		clear,
		reset: clear,
		invalidate: clear,
		switchScope(next: Scope) {
			if (disposed) return;
			scope = JSON.parse(encodeScope(next));
			generation++;
			value.value = undefined;
			status.value = 'missing';
		},
		async remember(name: string, loader: () => Promise<T>): Promise<Result<T>> {
			if (disposed) return { status: 'disposed' };
			const token = generation;
			try {
				const data = await loader();
				if (disposed || token !== generation) return { status: 'stale' };
				const result = write(name, data);
				return { status: result, ...(result === 'ok' ? { value: data } : {}) };
			} catch {
				if (disposed || token !== generation) return { status: 'stale' };
				return { status: (status.value = 'unavailable') };
			}
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			generation++;
			value.value = undefined;
			status.value = 'disposed';
		}
	};
}
