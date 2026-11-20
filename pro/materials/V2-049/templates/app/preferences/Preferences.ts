import { computed, readonly, ref } from 'vue';
import type { PreferenceOptions, Preferences, ThemeChoice, StorageStatus } from './Types.js';
import { storageKey, readJson, record } from './Storage.js';
const themeValid = (value: unknown): value is ThemeChoice =>
	typeof value === 'string' && ['light', 'dark', 'system'].includes(value);
export function createPreferences(options: PreferenceOptions) {
	if (!Object.hasOwn(options.dictionaries, options.fallbackLocale))
		throw new Error('Missing fallback dictionary');
	const key = storageKey(options.app, 'preferences', options.owner);
	const status = ref<StorageStatus>('missing');
	const issues = ref<string[]>([]);
	const issue = (message: string) => {
		issues.value.push(message);
		options.onIssue?.(message);
	};
	const validLocale = (value: unknown): value is string =>
		typeof value === 'string' && Object.hasOwn(options.dictionaries, value);
	const valid = (value: unknown): value is Preferences =>
		record(value) && validLocale(value.locale) && themeValid(value.theme);
	const defaults = (): Preferences => ({
		locale: validLocale(options.initial?.locale)
			? options.initial.locale
			: options.fallbackLocale,
		theme: themeValid(options.initial?.theme) ? options.initial.theme : 'system'
	});
	let disposed = false;
	let blocked = false;
	const selected = ref<Preferences>(defaults());
	const dark = ref(options.system?.matches ?? false);
	const persist = () => {
		if (disposed) return (status.value = 'disposed');
		if (blocked) return status.value;
		try {
			if (!options.storage) return (status.value = 'unavailable');
			options.storage.setItem(
				key,
				JSON.stringify({ version: 2, owner: key, data: selected.value })
			);
			return (status.value = 'ok');
		} catch {
			return (status.value = 'unavailable');
		}
	};
	const restore = () => {
		const result = readJson(options.storage, key);
		status.value = result.status;
		const value = result.value;
		if (result.status !== 'ok') {
			blocked = result.status === 'invalid' || result.status === 'unavailable';
			return;
		}
		if (!record(value) || value.owner !== key || !Number.isInteger(value.version)) {
			status.value = 'invalid';
			blocked = true;
			return;
		}
		if (Number(value.version) > 2) {
			status.value = 'future';
			blocked = true;
			return;
		}
		if (value.version === 2 && valid(value.data)) {
			selected.value = { ...value.data };
			return;
		}
		// The only supported historical schema is v1: { language, dark }.
		if (
			value.version === 1 &&
			record(value.data) &&
			validLocale(value.data.language) &&
			typeof value.data.dark === 'boolean'
		) {
			selected.value = {
				locale: value.data.language,
				theme: value.data.dark ? 'dark' : 'light'
			};
			if (persist() === 'ok') status.value = 'migrated';
			return;
		}
		status.value = 'invalid';
		blocked = true;
	};
	restore();
	if (options.initial?.locale !== undefined && !validLocale(options.initial.locale))
		issue('unsupported-initial-locale');
	if (options.force?.locale !== undefined && !validLocale(options.force.locale))
		issue('unsupported-forced-locale');
	const locale = computed(() =>
		validLocale(options.force?.locale) ? options.force.locale : selected.value.locale
	);
	const theme = computed(() =>
		themeValid(options.force?.theme) ? options.force.theme : selected.value.theme
	);
	const colorMode = computed(() =>
		theme.value === 'system' ? (dark.value ? 'dark' : 'light') : theme.value
	);
	const listener = (event: { matches: boolean }) => {
		if (!disposed) dark.value = event.matches;
	};
	options.system?.addEventListener('change', listener);
	function choose(next: Partial<Preferences>) {
		if (disposed) return false;
		if (next.locale !== undefined && !validLocale(next.locale)) {
			issue(`unsupported-locale:${next.locale}`);
			return false;
		}
		if (next.theme !== undefined && !themeValid(next.theme)) {
			issue('unsupported-theme');
			return false;
		}
		selected.value = {
			locale: next.locale ?? selected.value.locale,
			theme: next.theme ?? selected.value.theme
		};
		persist();
		return true;
	}
	function t(key: string, values: Readonly<Record<string, string | number>> = {}) {
		const current = options.dictionaries[locale.value]!;
		const fallback = options.dictionaries[options.fallbackLocale]!;
		let text = Object.hasOwn(current, key) ? current[key] : undefined;
		if (text === undefined) {
			issue(`missing-key:${locale.value}:${key}`);
			text = Object.hasOwn(fallback, key) ? fallback[key] : key;
		}
		return text!.replace(/\{(\w+)\}/g, (match, name: string) =>
			Object.hasOwn(values, name) ? String(values[name]) : match
		);
	}
	return {
		key,
		locale,
		theme,
		colorMode,
		status: readonly(status),
		issues: readonly(issues),
		choose,
		t,
		number: (value: number, format?: Intl.NumberFormatOptions) =>
			new Intl.NumberFormat(locale.value, format).format(value),
		date: (value: Date, format?: Intl.DateTimeFormatOptions) =>
			new Intl.DateTimeFormat(locale.value, format).format(value),
		reset() {
			if (disposed) return;
			try {
				if (!options.storage) {
					status.value = 'unavailable';
					return;
				}
				options.storage.removeItem(key);
			} catch {
				status.value = 'unavailable';
				return;
			}
			blocked = false;
			selected.value = defaults();
			status.value = 'missing';
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			options.system?.removeEventListener('change', listener);
		}
	};
}
export type PreferenceController = ReturnType<typeof createPreferences>;
