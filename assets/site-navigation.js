(() => {
	'use strict';
	if (!document.querySelector('#site-view')) return;
	const versionPanel = document.querySelector('[data-site-versions]');
	const versionLabel = versionPanel?.querySelector('[data-site-version-label]');
	document.addEventListener('click', (event) => {
		if (versionPanel?.open && !event.composedPath().includes(versionPanel))
			versionPanel.open = false;
	});
	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape' || !versionPanel?.open) return;
		const restoreFocus = versionPanel.contains(document.activeElement);
		versionPanel.open = false;
		if (restoreFocus) versionPanel.querySelector('summary').focus();
	});
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
	const initialPosition = history.state?.asamPosition;
	const navigationType = performance.getEntriesByType('navigation')[0]?.type;
	let restoring = Boolean(initialPosition && ['reload', 'back_forward'].includes(navigationType));
	let restoration;
	// A new Document can belong to an existing history entry. Keep its saved reading
	// position until restoration finishes instead of replacing it with startup scrollY.
	if (!initialPosition) history.replaceState(state(), '');
	history.scrollRestoration = 'manual';
	const savePosition = () => {
		if (
			!restoring &&
			(!pending || (activeNavigation?.committed && activeNavigation.userPosition))
		)
			history.replaceState(state(), '');
	};
	let scrollFrame;
	const schedulePositionSave = () => {
		cancelAnimationFrame(scrollFrame);
		scrollFrame = requestAnimationFrame(savePosition);
	};
	const cancelRestoration = () => {
		if (!restoring) return;
		restoring = false;
		restoration?.abort();
		restoration = undefined;
		// Input defaults (wheel, keys and anchors) run after their event handlers.
		schedulePositionSave();
	};
	const cancelReadingRestore = () => {
		cancelRestoration();
		if (!pending || !activeNavigation?.committed) return;
		activeNavigation.userPosition = true;
		// The user now owns this committed view while its demos continue loading.
		document.querySelector('#site-view').style.overflowAnchor = '';
		schedulePositionSave();
	};
	for (const name of ['wheel', 'touchstart', 'pointerdown'])
		addEventListener(name, cancelReadingRestore, { passive: true });
	addEventListener('keydown', (event) => {
		if (
			event.defaultPrevented ||
			event.metaKey ||
			event.ctrlKey ||
			event.altKey ||
			![
				'ArrowUp',
				'ArrowDown',
				'ArrowLeft',
				'ArrowRight',
				'PageUp',
				'PageDown',
				'Home',
				'End',
				' '
			].includes(event.key) ||
			(event.target instanceof Element &&
				event.target.closest('input, textarea, select, [contenteditable]'))
		)
			return;
		cancelReadingRestore();
	});
	addEventListener('hashchange', cancelRestoration);
	addEventListener('pageshow', async (event) => {
		if (!restoring && !event.persisted) return;
		const saved = history.state?.asamPosition;
		if (!saved) return;
		restoration?.abort();
		const controller = new AbortController();
		restoration = controller;
		restoring = true;
		const current = revision;
		const obsolete = () => controller.signal.aborted || current !== revision;
		try {
			await withNavigationAbort(document.fonts?.ready, controller.signal);
			if (obsolete()) return;
			try {
				await demosReady(document.querySelector('#site-view'), controller.signal);
			} catch {
				// A failed demo must not discard the document reading position.
			}
			if (obsolete()) return;
			await new Promise(requestAnimationFrame);
			if (obsolete()) return;
			scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
			await new Promise(requestAnimationFrame);
		} catch {
			// User input or another navigation can cancel a pending layout wait.
		} finally {
			if (restoration === controller) {
				restoration = undefined;
				restoring = false;
			}
		}
	});
	addEventListener('scroll', schedulePositionSave, { passive: true });
	const emit = (name, detail) =>
		document.dispatchEvent(new CustomEvent(`asam:page-${name}`, { detail }));
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
	async function styles(next, target, signal) {
		const existing = new Map(
			[...document.querySelectorAll('link[rel="stylesheet"]')].map((n) => [n.href, n])
		);
		const ordered = await Promise.all(
			[...next.querySelectorAll('link[rel="stylesheet"]')].map((source) => {
				const href = new URL(source.getAttribute('href'), target).href;
				if (new URL(href).origin !== location.origin) throw new Error('跨站样式');
				if (existing.has(href)) return existing.get(href);
				return new Promise((resolve, reject) => {
					const link = document.createElement('link');
					const timer = setTimeout(() => reject(new Error('样式加载超时')), 10000);
					link.rel = 'stylesheet';
					link.href = href;
					existing.set(href, link);
					link.onload = () => {
						clearTimeout(timer);
						resolve(link);
					};
					link.onerror = () => {
						clearTimeout(timer);
						reject(new Error('样式加载失败'));
					};
					document.head.append(link);
				});
			})
		);
		// 同一文档通过直达或局部导航打开时，样式层叠顺序必须一致。
		if (signal.aborted) return;
		const current = [...document.querySelectorAll('link[rel="stylesheet"]')];
		const tail = current.slice(-ordered.length);
		if (tail.length === ordered.length && tail.every((link, i) => link === ordered[i])) return;
		for (const link of ordered) {
			// 原子移动保留已加载样式；普通append会重新挂接样式并使滚动容器短暂塌陷。
			if (typeof document.head.moveBefore === 'function')
				document.head.moveBefore(link, null);
			else document.head.append(link);
		}
	}
	function reflectLinks(root, nextRoot) {
		const key = (anchor) => {
			const region = anchor.closest('.docs-primary-navigation')
				? 'primary-sidebar'
				: anchor.closest('.docs-sidebar')
					? 'sidebar'
					: 'header';
			return `${region}:${anchor.getAttribute('href')}`;
		};
		const current = new Map(
			[
				...nextRoot.querySelectorAll('a[aria-current="page"], a[aria-current="location"]')
			].map((anchor) => [key(anchor), anchor.getAttribute('aria-current')])
		);
		for (const anchor of root.querySelectorAll('a[href]')) {
			const active = current.get(key(anchor));
			const selected = Boolean(active);
			if (active) anchor.setAttribute('aria-current', active);
			else anchor.removeAttribute('aria-current');
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
	function preserveSidebar(root, nextRoot, positions) {
		const before = root?.querySelector('.docs-sidebar');
		const after = nextRoot?.querySelector('.docs-sidebar');
		if (before && after && before.dataset.siteSection === after.dataset.siteSection) {
			const scroll = positions.get(before) ?? before.scrollTop;
			reflectLinks(before, after);
			after.replaceWith(before);
			requestAnimationFrame(() => {
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
		} else scrollTo({ left: 0, top: 0, behavior: 'instant' });
	}
	function demosReady(view, signal) {
		return new Promise((resolve, reject) => {
			if (signal.aborted) {
				reject(signal.reason);
				return;
			}
			const ready = () => {
				const cardsReady = [...view.querySelectorAll('.cd-demo[data-demo]')].every(
					(card) => {
						if (['true', 'source-only', 'error'].includes(card.dataset.ready))
							return true;
						// 延迟到接近视口才加载的示例，不应使局部导航等待整页所有卡片。
						const bounds = card.getBoundingClientRect();
						return (
							card.dataset.ready === 'pending' &&
							(bounds.top > innerHeight + 240 || bounds.bottom < -240)
						);
					}
				);
				// 首页页签也使用 data-demo，但不是示例卡片；等待真实运行区的状态。
				const homeReady = [
					...view.querySelectorAll('.pro-home-runtime + [role="status"]')
				].every(
					(status) =>
						status.hidden ||
						document.getElementById(status.id.replace(/-state$/, '-retry'))?.hidden ===
							false
				);
				return cardsReady && homeReady;
			};
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
				attributeFilter: ['data-ready', 'hidden']
			});
			signal.addEventListener('abort', abort, { once: true });
		});
	}
	async function navigate(url, { pop = false, restored } = {}) {
		cancelRestoration();
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
				next.documentElement.lang !== document.documentElement.lang ||
				next.querySelector('meta[name="asam-site-build"]')?.content !== build
			)
				throw new Error('页面版本或结构不匹配');
			const view = document.querySelector('#site-view');
			const positions = new Map();
			const preserved = [];
			for (const [root, nextRoot] of [
				[view, incoming],
				[header, nextHeader]
			]) {
				const before = root?.querySelector('.docs-sidebar');
				const after = nextRoot?.querySelector('.docs-sidebar');
				if (before && after && before.dataset.siteSection === after.dataset.siteSection) {
					positions.set(before, before.scrollTop);
					preserved.push(before);
				}
			}
			await withNavigationAbort(styles(next, url, signal), signal);
			if (signal.aborted || current !== revision) return;
			emit('leave', { preserved });
			for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
			document.body.style.overflow = '';
			preserveSidebar(view, incoming, positions);
			preserveSidebar(header, nextHeader, positions);
			reflectLinks(header, nextHeader);
			const languageLink = header.querySelector('[data-site-language-toggle]');
			const nextLanguageLink = nextHeader.querySelector('[data-site-language-toggle]');
			if (languageLink && nextLanguageLink) {
				for (const name of [
					'data-site-language-route',
					'data-site-language-match',
					'aria-label',
					'title'
				])
					languageLink.setAttribute(name, nextLanguageLink.getAttribute(name));
			}
			if (versionPanel) {
				versionPanel.open = false;
				versionLabel.textContent = nextHeader.querySelector(
					'[data-site-version-label]'
				).textContent;
			}
			const menu = header.querySelector('#mobile-nav');
			menu.querySelectorAll('.mobile-section-nav').forEach((node) => node.remove());
			menu.append(...nextHeader.querySelectorAll('.mobile-section-nav'));
			menu.hidden = true;
			const toggle = header.querySelector('.menu-toggle');
			toggle.setAttribute('aria-expanded', 'false');
			toggle.setAttribute(
				'aria-label',
				document.documentElement.lang === 'en' ? 'Open navigation' : '展开导航'
			);
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
			if (!pop) {
				history.pushState({ asamPosition: { x: 0, y: 0 } }, '', url.href);
				// 普通新导航提交后立即回顶，不等待异步示例加载后才重置旧页面位置。
				// 锚点与历史位置仍在原有的就绪流程中恢复。
				if (!url.hash) scrollTo({ left: 0, top: 0, behavior: 'instant' });
			}
			rendered = location.pathname + location.search;
			navigation.committed = true;
			emit('commit');
			// Only known page runtimes run; imported document scripts remain inert.
			for (const script of next.querySelectorAll('script[src]')) {
				const sourceUrl = new URL(script.getAttribute('src'), url);
				if (
					sourceUrl.origin === location.origin &&
					/^\/assets\/(?:catalog-page|icon-collection|type-dictionary|home-interactive|home-motion|pro-docs|pro-home|pro-template-preview|pro-demo\/template-inline|pro-components(?:-[a-z0-9][a-z0-9-]{0,63})?\/(?:sfc-demo|filters|home-demo)|(?:theme-demo|sfc-demo(?:-[a-z0-9][a-z0-9-]{0,63})?)\/sfc-demo|capability-demo\/capability-demo|home-scene\/home-scene)\.js$/.test(
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
			if (!navigation.userPosition) scrollToTarget(navigation.url, navigation.restored);
		} catch {
			if ((!signal.aborted || timedOut) && current === revision)
				nativeFallback(navigation.url);
		} finally {
			clearTimeout(timeout);
			if (current === revision) {
				pending = false;
				if (navigation.userPosition) savePosition();
			}
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
		if (url.origin === location.origin && url.pathname + url.search === rendered)
			cancelReadingRestore();
		if (url.pathname.startsWith('/en/') !== location.pathname.startsWith('/en/')) return;
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
		cancelRestoration();
		const url = new URL(location.href);
		if (url.pathname + url.search === rendered) {
			if (pending && activeNavigation?.committed) {
				activeNavigation.url = url;
				activeNavigation.userPosition = false;
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
