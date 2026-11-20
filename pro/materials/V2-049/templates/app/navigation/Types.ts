import type { Component } from 'vue';
import type {
	Router,
	RouteLocationNormalizedLoaded,
	RouteLocationNormalized,
	RouteLocationRaw
} from 'vue-router';

export interface NavigationItem {
	id: string;
	parentId?: string;
	path: string;
	/** Optional menu landing location for a parameterized route. */
	location?: RouteLocationRaw;
	title: string;
	icon?: string;
	resource: string;
	cache?: boolean;
	pinned?: boolean;
	hidden?: boolean;
	iframe?: string;
}
export interface NavigationTab {
	id: string;
	routeId: string;
	fullPath: string;
	title: string;
	cacheKey: string;
	cache: boolean;
	pinned: boolean;
	epoch: number;
}
export type NavigationAction = 'navigate' | 'close' | 'refresh' | 'update';
export interface NavigationOptions {
	router: Router;
	/** Explicit allowlist. Remote strings never become import paths. */
	components: Readonly<Record<string, Component>>;
	load: (context: { signal: AbortSignal; scope: string }) => Promise<readonly NavigationItem[]>;
	fallback: RouteLocationRaw;
	scope?: string;
	confirm?: (
		action: NavigationAction,
		from: RouteLocationNormalizedLoaded
	) => boolean | Promise<boolean>;
	visible?: (item: Readonly<NavigationItem>) => boolean;
	cacheKey?: (route: RouteLocationNormalized, item: Readonly<NavigationItem>) => string;
	/** Number of retained page instances; default 10. */
	maxCache?: number;
}
export interface EmbedPolicy {
	resolve: (input: string) => string;
	allow: (url: URL) => boolean;
	sandbox?: string;
	permissions?: string;
	referrerPolicy?: ReferrerPolicy;
}
