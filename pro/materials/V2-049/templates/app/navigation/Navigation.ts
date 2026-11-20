import { computed, markRaw, readonly, ref, shallowRef, shallowReadonly } from 'vue';
import { createRouterMatcher, isNavigationFailure, NavigationFailureType } from 'vue-router';
import type {
	RouteRecordRaw,
	RouteLocationRaw,
	RouteLocationNormalized,
	RouteLocationNormalizedLoaded
} from 'vue-router';
import type {
	NavigationAction,
	NavigationItem,
	NavigationOptions,
	NavigationTab
} from './Types.js';

/** One application module. The host owns the router and all routes outside this module. */
export function createNavigation(options: NavigationOptions) {
	const { router } = options;
	const menu = shallowRef<readonly NavigationItem[]>([]);
	const tabs = ref<NavigationTab[]>([]);
	const error = ref('');
	const loading = ref(false);
	const revision = ref(0);
	const active = ref('');
	const retained = ref<string[]>([]);
	const namespace = `asam-navigation-${++moduleSequence}:`;
	let generation = 0;
	let operation = 0;
	let action = 0;
	let disposed = false;
	let scope = options.scope ?? '';
	let abort: AbortController | undefined;
	let removers: (() => void)[] = [];
	let records: RouteRecordRaw[] = [];
	const max = options.maxCache ?? 10;
	if (!Number.isInteger(max) || max < 1) throw new Error('maxCache 必须为正整数');
	const name = (id: string) => namespace + id;
	const currentItem = (route: RouteLocationNormalized) =>
		menu.value.find((item) => route.name === name(item.id));
	const fail = (message: string) => {
		error.value = message;
		return false;
	};
	async function permitted(action: NavigationAction) {
		try {
			return (await options.confirm?.(action, router.currentRoute.value)) !== false;
		} catch {
			return fail('离开确认失败，请重试');
		}
	}
	function visit(route: RouteLocationNormalizedLoaded) {
		if (disposed) return;
		const item = currentItem(route);
		if (!item) {
			active.value = '';
			return;
		}
		const id = route.fullPath;
		let cacheKey: string;
		try {
			cacheKey = options.cacheKey ? options.cacheKey(route, item) : route.fullPath;
		} catch {
			fail('cacheKey 计算失败，请检查宿主配置');
			return;
		}
		if (typeof cacheKey !== 'string' || !cacheKey) {
			fail('cacheKey 必须为非空字符串');
			return;
		}
		let tab = tabs.value.find((entry) => entry.id === id);
		if (!tab) {
			tab = {
				id,
				routeId: item.id,
				fullPath: route.fullPath,
				title: item.title,
				cacheKey: JSON.stringify([item.id, cacheKey]),
				cache: item.cache !== false,
				pinned: !!item.pinned,
				epoch: 0
			};
			tabs.value.push(tab);
		}
		active.value = id;
		if (tab.cache) {
			retained.value = [
				...retained.value.filter((key) => key !== tab.cacheKey),
				tab.cacheKey
			].slice(-max);
		}
	}
	// The guard also covers host push/replace and browser back/forward.
	const removeGuard = router.beforeEach(async (to, from) => {
		if (disposed || to.fullPath === from.fullPath) return true;
		const item = currentItem(to);
		if (item) {
			try {
				const key = options.cacheKey ? options.cacheKey(to, item) : to.fullPath;
				if (typeof key !== 'string' || !key) return fail('cacheKey 必须为非空字符串');
			} catch {
				return fail('cacheKey 计算失败，请检查宿主配置');
			}
		}
		const token = ++operation;
		const accepted = await permitted('navigate');
		return !disposed && token === operation && accepted;
	});
	const removeAfter = router.afterEach((to, _from, failure) => {
		if (!failure) visit(to);
	});
	async function navigate(target: RouteLocationRaw, replace = false) {
		if (disposed) return false;
		error.value = '';
		try {
			const resolved = router.resolve(target);
			if (!resolved.matched.length) return fail('未匹配的页面');
			const result = await (replace ? router.replace(target) : router.push(target));
			if (isNavigationFailure(result)) {
				// Duplicate navigation is a successful no-op only when already at the target.
				return (
					isNavigationFailure(result, NavigationFailureType.duplicated) &&
					router.currentRoute.value.fullPath === resolved.fullPath
				);
			}
			return !disposed;
		} catch {
			return fail('导航失败，请重试');
		}
	}
	function validate(input: readonly NavigationItem[]) {
		if (!Array.isArray(input)) throw new Error('菜单必须为数组');
		const ids = new Set<string>();
		const paths = new Set<string>();
		const copy = input.map((entry) => {
			if (!entry || typeof entry.id !== 'string' || !entry.id.trim() || ids.has(entry.id))
				throw new Error('非法或重复菜单 id');
			if (
				typeof entry.path !== 'string' ||
				!entry.path.startsWith('/') ||
				paths.has(pathShape(entry.path))
			)
				throw new Error('非法或冲突路径');
			if (typeof entry.title !== 'string' || !entry.title.trim())
				throw new Error('缺少菜单标题');
			if (!Object.hasOwn(options.components, entry.resource)) throw new Error('未知页面资源');
			if (
				router.hasRoute(name(entry.id)) &&
				!records.some((record) => record.name === name(entry.id))
			)
				throw new Error('命名路由与宿主冲突');
			if (
				router
					.getRoutes()
					.some(
						(route) =>
							pathShape(route.path) === pathShape(entry.path) &&
							!records.some((record) => record.name === route.name)
					)
			)
				throw new Error('路径与宿主冲突');
			ids.add(entry.id);
			paths.add(pathShape(entry.path));
			return Object.freeze({ ...entry });
		});
		for (const item of copy) {
			const seen = new Set([item.id]);
			let parent = item.parentId;
			while (parent) {
				if (seen.has(parent)) throw new Error('菜单父子循环');
				seen.add(parent);
				const found = copy.find((entry) => entry.id === parent);
				if (!found) throw new Error('菜单父级不存在');
				parent = found.parentId;
			}
		}
		return copy;
	}
	async function reload(nextScope = scope) {
		if (disposed) return false;
		const token = ++generation;
		abort?.abort();
		abort = new AbortController();
		scope = nextScope;
		loading.value = true;
		error.value = '';
		try {
			const next = validate(await options.load({ signal: abort.signal, scope }));
			if (disposed || token !== generation) return false;
			const nextRecords: RouteRecordRaw[] = next.map((item) => ({
				path: item.path,
				name: name(item.id),
				component: markRaw(options.components[item.resource]!),
				props: true,
				meta: { navigationId: item.id, iframe: item.iframe }
			}));
			// Use Vue Router's own registration parser before confirmation/navigation.
			// This disposable matcher owns no history, guards or application routes.
			createRouterMatcher(nextRecords, router.options);
			const current = currentItem(router.currentRoute.value);
			const changedCurrent =
				current &&
				!next.some(
					(item) =>
						item.id === current.id &&
						item.path === current.path &&
						item.resource === current.resource
				);
			if (changedCurrent && !(await permitted('update'))) return false;
			if (disposed || token !== generation) return false;
			// Navigate before removal. Cancellation preserves both the installed version and tabs.
			if (changedCurrent && !(await navigate(options.fallback, true))) return false;
			if (disposed || token !== generation) return false;
			removers.forEach((remove) => remove());
			const installed: (() => void)[] = [];
			try {
				for (const record of nextRecords) installed.push(router.addRoute(record));
			} catch (cause) {
				installed.forEach((remove) => remove());
				removers = records.map((record) => router.addRoute(record));
				throw cause;
			}
			removers = installed;
			records = nextRecords;
			action++;
			const stale = new Set(
				menu.value
					.filter(
						(old) =>
							!next.some(
								(item) =>
									item.id === old.id &&
									item.path === old.path &&
									item.resource === old.resource
							)
					)
					.map((item) => item.id)
			);
			tabs.value = tabs.value.filter((tab) => !stale.has(tab.routeId));
			menu.value = next;
			for (const tab of tabs.value) {
				const item = next.find((entry) => entry.id === tab.routeId)!;
				tab.title = item.title;
				tab.pinned = !!item.pinned;
				tab.cache = item.cache !== false;
			}
			prune();
			revision.value++;
			// Re-resolve initial deep links after dynamic registration.
			await navigate(router.currentRoute.value.fullPath, true);
			visit(router.currentRoute.value);
			return true;
		} catch {
			if (!disposed && token === generation) fail('菜单加载或校验失败，保留上一版本，可重试');
			return false;
		} finally {
			if (!disposed && token === generation) loading.value = false;
		}
	}
	function prune() {
		retained.value = retained.value.filter((key) =>
			tabs.value.some((tab) => tab.cache && tab.cacheKey === key)
		);
	}
	async function close(ids: readonly string[]) {
		if (disposed) return false;
		const closing = tabs.value.filter((tab) => ids.includes(tab.id) && !tab.pinned);
		if (!closing.length) return true;
		const token = ++action;
		if (!(await permitted('close')) || disposed || token !== action) return false;
		if (closing.some((tab) => tab.id === active.value)) {
			const survivor = tabs.value.find(
				(tab) => !closing.some((entry) => entry.id === tab.id)
			);
			if (!(await navigate(survivor?.fullPath ?? options.fallback))) return false;
		}
		if (disposed || token !== action) return false;
		tabs.value = tabs.value.filter((tab) => !closing.some((entry) => entry.id === tab.id));
		prune();
		return true;
	}
	async function refresh(id = active.value) {
		const token = ++action;
		if (!(await permitted('refresh')) || disposed || token !== action) return false;
		const tab = tabs.value.find((entry) => entry.id === id);
		if (!tab) return false;
		// All tabs sharing an explicit cache identity refer to the same refreshed instance.
		for (const entry of tabs.value) if (entry.cacheKey === tab.cacheKey) entry.epoch++;
		return true;
	}
	function move(id: string, targetId: string) {
		if (disposed) return;
		const from = tabs.value.findIndex((tab) => tab.id === id && !tab.pinned);
		const to = tabs.value.findIndex((tab) => tab.id === targetId && !tab.pinned);
		if (from < 0 || to < 0 || from === to) return;
		const [tab] = tabs.value.splice(from, 1);
		tabs.value.splice(to, 0, tab!);
	}
	const pages = computed(() => {
		const unique = new Map<string, NavigationTab>();
		for (const tab of tabs.value)
			if ((tab.cache && retained.value.includes(tab.cacheKey)) || tab.id === active.value)
				unique.set(tab.cacheKey, tab);
		const current = tabs.value.find((tab) => tab.id === active.value);
		if (current) unique.set(current.cacheKey, current);
		return [...unique.values()];
	});
	function dispose() {
		if (disposed) return;
		disposed = true;
		generation++;
		operation++;
		action++;
		abort?.abort();
		removeGuard();
		removeAfter();
		removers.forEach((remove) => remove());
		tabs.value = [];
		menu.value = [];
		retained.value = [];
		loading.value = false;
	}
	return {
		menu: shallowReadonly(menu),
		tabs: readonly(tabs),
		pages,
		active: readonly(active),
		error: readonly(error),
		loading: readonly(loading),
		revision: readonly(revision),
		router,
		visibleMenu: computed(() =>
			menu.value.filter((item) => !item.hidden && (options.visible?.(item) ?? true))
		),
		navigate,
		reload,
		close,
		refresh,
		move,
		dispose,
		closeOthers: () =>
			close(tabs.value.filter((tab) => tab.id !== active.value).map((tab) => tab.id)),
		closeAll: () => close(tabs.value.map((tab) => tab.id)),
		component: (id: string) =>
			options.components[menu.value.find((item) => item.id === id)?.resource ?? ''],
		location: (id: string) => ({ name: name(id) })
	};
}
let moduleSequence = 0;
function pathShape(path: string) {
	return path
		.replace(/:[A-Za-z0-9_]+/g, ':param')
		.replace(/\/+$/, '')
		.toLowerCase();
}
export type NavigationController = ReturnType<typeof createNavigation>;
