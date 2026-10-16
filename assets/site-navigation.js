(() => {
	'use strict';
	if (!document.querySelector('#site-view')) return;
	const build = document.querySelector('meta[name="asam-site-build"]')?.content;
	const scriptLoads = new Map();
	for (const script of document.querySelectorAll('script[src]'))
		scriptLoads.set(script.src, Promise.resolve());
	let request;
	let revision = 0;
	let rendered = location.pathname + location.search;
	let pending = false;
	let activeNavigation;
	const position = () => ({ x: scrollX, y: scrollY });
	const state = () => ({ ...(history.state || {}), asamPosition: position() });
	history.replaceState(state(), '');
	history.scrollRestoration = 'manual';
	const savePosition = () => {
		if (!pending) history.replaceState(state(), '');
	};
	let scrollFrame;
	addEventListener(
		'scroll',
		() => {
			cancelAnimationFrame(scrollFrame);
			scrollFrame = requestAnimationFrame(savePosition);
		},
		{ passive: true }
	);
	const emit = (name) => document.dispatchEvent(new Event(`asam:page-${name}`));
	const nativeFallback = (url) => {
		if (url.pathname === location.pathname && url.search === location.search) {
			history.replaceState(history.state, '', url.href);
			location.reload();
		} else location.assign(url.href);
	};
	const withNavigationAbort = (promise, signal) =>
		new Promise((resolve, reject) => {
			const abort = () =>
				reject(signal.reason || new DOMException('导航已取消', 'AbortError'));
			Promise.resolve(promise).then(
				(value) => {
					signal.removeEventListener('abort', abort);
					resolve(value);
				},
				(error) => {
					signal.removeEventListener('abort', abort);
					reject(error);
				}
			);
			if (signal.aborted) abort();
			else signal.addEventListener('abort', abort, { once: true });
		});
	const loadScript = (source, url) => {
		if (scriptLoads.has(url.href)) return scriptLoads.get(url.href);
		const loading = new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = url.href;
			if (source.type === 'module') script.type = 'module';
			script.onload = resolve;
			script.onerror = reject;
			document.head.append(script);
		});
		scriptLoads.set(url.href, loading);
		return loading;
	};
	async function styles(next, target) {
		const existing = new Set(
			[...document.querySelectorAll('link[rel="stylesheet"]')].map((n) => n.href)
		);
		await Promise.all(
			[...next.querySelectorAll('link[rel="stylesheet"]')].map((source) => {
				const href = new URL(source.getAttribute('href'), target).href;
				if (new URL(href).origin !== location.origin) throw new Error('跨站样式');
				if (existing.has(href)) return;
				return new Promise((resolve, reject) => {
					const link = document.createElement('link');
					const timer = setTimeout(() => reject(new Error('样式加载超时')), 10000);
					link.rel = 'stylesheet';
					link.href = href;
					link.onload = () => {
						clearTimeout(timer);
						resolve();
					};
					link.onerror = () => {
						clearTimeout(timer);
						reject(new Error('样式加载失败'));
					};
					document.head.append(link);
				});
			})
		);
	}
	function reflectLinks(root, nextRoot) {
		for (const anchor of root.querySelectorAll('a[href]')) {
			const selected = [...nextRoot.querySelectorAll('a[aria-current="page"]')].some(
				(next) => next.getAttribute('href') === anchor.getAttribute('href')
			);
			anchor.toggleAttribute('aria-current', selected);
			if (selected) anchor.setAttribute('aria-current', 'page');
			if (anchor.closest('.docs-sidebar')) anchor.classList.toggle('selected', selected);
			if (selected) {
				for (
					let parent = anchor.parentElement;
					parent && parent !== root;
					parent = parent.parentElement
				)
					if (parent.tagName === 'DETAILS') parent.open = true;
			}
		}
	}
	function preserveSidebar(root, nextRoot) {
		const before = root?.querySelector('.docs-sidebar');
		const after = nextRoot?.querySelector('.docs-sidebar');
		if (before && after && before.dataset.siteSection === after.dataset.siteSection) {
			const scroll = before.scrollTop;
			reflectLinks(before, after);
			after.replaceWith(before);
			queueMicrotask(() => {
				before.scrollTop = scroll;
			});
		}
	}
	function scrollToTarget(url, restored) {
		const main = document.querySelector('#main, main, article');
		main?.setAttribute('tabindex', '-1');
		main?.focus({ preventScroll: true });
		if (restored) scrollTo(restored.x, restored.y);
		else if (url.hash) {
			let id;
			try {
				id = decodeURIComponent(url.hash.slice(1));
			} catch {
				id = url.hash.slice(1);
			}
			document.getElementById(id)?.scrollIntoView();
		} else scrollTo(0, 0);
	}
	function demosReady(view, signal) {
		return new Promise((resolve, reject) => {
			if (signal.aborted) {
				reject(signal.reason);
				return;
			}
			const ready = () =>
				[...view.querySelectorAll('[data-demo]')].every((card) =>
					['true', 'source-only', 'error'].includes(card.dataset.ready)
				);
			if (ready()) return resolve();
			const finish = (error) => {
				observer.disconnect();
				clearTimeout(timer);
				signal.removeEventListener('abort', abort);
				if (error) reject(error);
				else resolve();
			};
			const abort = () => finish(new Error('导航已取消'));
			const observer = new MutationObserver(() => {
				if (ready()) finish();
			});
			const timer = setTimeout(() => finish(new Error('示例加载超时')), 20000);
			observer.observe(view, {
				subtree: true,
				attributes: true,
				attributeFilter: ['data-ready']
			});
			signal.addEventListener('abort', abort, { once: true });
		});
	}
	async function navigate(url, { pop = false, restored } = {}) {
		request?.abort();
		request = new AbortController();
		const controller = request;
		const signal = controller.signal;
		const current = ++revision;
		const navigation = { url, restored, committed: false };
		activeNavigation = navigation;
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			controller.abort();
		}, 30000);
		pending = true;
		try {
			const response = await fetch(url.href, { signal, headers: { Accept: 'text/html' } });
			if (!response.ok || new URL(response.url).origin !== location.origin)
				throw new Error('页面请求失败');
			const next = new DOMParser().parseFromString(await response.text(), 'text/html');
			const incoming = next.querySelector('#site-view');
			const header = document.querySelector('[data-site-component="header"]');
			const nextHeader = next.querySelector('[data-site-component="header"]');
			if (
				!incoming ||
				!nextHeader ||
				next.querySelector('meta[name="asam-site-build"]')?.content !== build
			)
				throw new Error('页面版本或结构不匹配');
			await withNavigationAbort(styles(next, url), signal);
			if (signal.aborted || current !== revision) return;
			emit('leave');
			for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
			document.body.style.overflow = '';
			preserveSidebar(document.querySelector('#site-view'), incoming);
			preserveSidebar(header, nextHeader);
			reflectLinks(header, nextHeader);
			const menu = header.querySelector('#mobile-nav');
			menu.querySelectorAll('.mobile-section-nav').forEach((node) => node.remove());
			menu.append(...nextHeader.querySelectorAll('.mobile-section-nav'));
			menu.hidden = true;
			const toggle = header.querySelector('.menu-toggle');
			toggle.setAttribute('aria-expanded', 'false');
			toggle.setAttribute('aria-label', '展开导航');
			// Async demo heights must settle before restoring document scroll.
			incoming.style.overflowAnchor = 'none';
			document.querySelector('#site-view').replaceWith(incoming);
			for (const attribute of [...document.body.attributes])
				document.body.removeAttribute(attribute.name);
			for (const attribute of next.body.attributes)
				if (attribute.name !== 'style')
					document.body.setAttribute(attribute.name, attribute.value);
			document.title = next.title;
			for (const name of ['description', 'asam-docs-version']) {
				const selector = `meta[name="${name}"]`;
				document.head.querySelector(selector)?.remove();
				const meta = next.head.querySelector(selector);
				if (meta) document.head.append(meta.cloneNode(true));
			}
			if (!pop) history.pushState({ asamPosition: { x: 0, y: 0 } }, '', url.href);
			rendered = location.pathname + location.search;
			navigation.committed = true;
			// Only known page runtimes run; imported document scripts remain inert.
			for (const script of next.querySelectorAll('script[src]')) {
				const sourceUrl = new URL(script.getAttribute('src'), url);
				if (
					sourceUrl.origin === location.origin &&
					/^\/assets\/(?:catalog-page|home-interactive|home-motion|sfc-demo\/sfc-demo|home-scene\/home-scene)\.js$/.test(
						sourceUrl.pathname
					)
				) {
					await withNavigationAbort(loadScript(script, sourceUrl), signal);
					if (signal.aborted || current !== revision) return;
				}
			}
			emit('enter');
			try {
				await demosReady(incoming, signal);
			} finally {
				incoming.style.overflowAnchor = '';
			}
			if (signal.aborted || current !== revision) return;
			scrollToTarget(navigation.url, navigation.restored);
		} catch (error) {
			if ((!signal.aborted || timedOut) && current === revision)
				nativeFallback(navigation.url);
		} finally {
			clearTimeout(timeout);
			if (current === revision) pending = false;
		}
	}
	document.addEventListener('click', (event) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.altKey ||
			event.shiftKey
		)
			return;
		const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
		if (
			!anchor ||
			anchor.hasAttribute('download') ||
			anchor.hasAttribute('data-native-navigation') ||
			(anchor.target && anchor.target !== '_self') ||
			anchor.closest('[data-demo-host]')
		)
			return;
		const url = new URL(anchor.href, location.href);
		if (url.origin === location.origin && url.pathname + url.search === rendered && pending) {
			if (activeNavigation?.committed) {
				activeNavigation.url = url;
				activeNavigation.anchor = url.href;
				activeNavigation.restored = undefined;
			} else {
				request?.abort();
				revision++;
				pending = false;
			}
		}
		if (
			url.origin !== location.origin ||
			!/\.html$/.test(url.pathname) ||
			url.pathname + url.search === rendered
		)
			return;
		event.preventDefault();
		savePosition();
		void navigate(url);
	});
	addEventListener('popstate', (event) => {
		const url = new URL(location.href);
		if (url.pathname + url.search === rendered) {
			if (pending && activeNavigation?.committed) {
				activeNavigation.url = url;
				activeNavigation.restored =
					activeNavigation.anchor === url.href ? undefined : event.state?.asamPosition;
				return;
			}
			request?.abort();
			revision++;
			pending = false;
			scrollToTarget(url, event.state?.asamPosition);
			return;
		}
		void navigate(url, { pop: true, restored: event.state?.asamPosition });
	});
})();
