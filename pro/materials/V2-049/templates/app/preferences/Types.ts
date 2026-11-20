export type ScopePart = string | number | null;
export type Scope = readonly ScopePart[];
export type ThemeChoice = 'light' | 'dark' | 'system';
export interface StorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}
export type StorageStatus =
	| 'missing'
	| 'ok'
	| 'migrated'
	| 'invalid'
	| 'future'
	| 'expired'
	| 'unavailable'
	| 'disposed'
	| 'stale';
export interface Result<T> {
	status: StorageStatus;
	value?: T;
}
export interface Preferences {
	locale: string;
	theme: ThemeChoice;
}
export interface SystemTheme {
	matches: boolean;
	addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
	removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
}
export interface PreferenceOptions {
	app: string;
	owner: Scope;
	storage?: StorageAdapter;
	dictionaries: Readonly<Record<string, Readonly<Record<string, string>>>>;
	fallbackLocale: string;
	initial?: Partial<Preferences>;
	/** Explicit host policy, separate from initial defaults. */
	force?: Partial<Preferences>;
	system?: SystemTheme;
	onIssue?: (issue: string) => void;
}
