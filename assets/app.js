(() => {
const initialize = () => {
(function initializeDesignPalette() {
	const root = document.documentElement;
	const update = () => {
		const elements = document.querySelectorAll('[data-palette-token]');
		if (!elements.length) return;
		const styles = getComputedStyle(root);
		for (const element of elements) {
			const token = element.dataset.paletteToken;
			const raw = styles.getPropertyValue(token).trim();
			if (!raw) continue;
			const value = /^#[0-9a-f]+$/i.test(raw) ? raw.toUpperCase() : raw;
			const label = element.querySelector('[data-palette-value]');
			const copy = element.matches('[data-copy-value]')
				? element
				: element.querySelector('[data-copy-value]');
			if (label) label.textContent = value;
			if (copy)
				copy.dataset.copyValue = element === copy ? token + ': ' + value + ';' : value;
		}
	};
	update();
	document.addEventListener('asam:document-controls-ready', update);
	new MutationObserver(update).observe(root, {
		attributes: true,
		attributeFilter: ['data-theme']
	});
})();
(() => {
	'use strict';
	const $ = (selector, root = document) => root.querySelector(selector);
	const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
	const catalog = window.ASAM_CATALOG || [];
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
	const canAnimate = () => window.gsap && !reduce.matches;
	let toastTimer;
	function notify(message) {
		const toast = $('.toast');
		clearTimeout(toastTimer);
		toast.textContent = message;
		toast.classList.add('visible');
		toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
	}
	async function copy(text) {
		try {
			if (navigator.clipboard && window.isSecureContext)
				await navigator.clipboard.writeText(text);
			else {
				const previous = document.activeElement;
				const field = document.createElement('textarea');
				field.value = text;
				field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
				(document.querySelector('dialog[open]') || document.body).append(field);
				field.select();
				const success = document.execCommand('copy');
				field.remove();
				previous?.focus();
				if (!success) throw new Error('Clipboard unavailable');
			}
			notify((document.documentElement.lang === 'en' ? 'Copied to clipboard' : '已复制到剪贴板'));
		} catch {
			notify('复制未完成，请手动选择并复制文本');
		}
	}
	document.addEventListener('click', (event) => {
		const button = event.target instanceof Element ? event.target.closest('[data-copy], [data-copy-value]') : null;
		if (!button) return;
		copy(button.hasAttribute('data-copy-value') ? button.dataset.copyValue : document.getElementById(button.dataset.copy)?.textContent || '');
	});
	const themeToggle = $('.theme-toggle');
	let requestedTheme = document.documentElement.dataset.theme;
	let themeTransition;
	let themeTimer;
	function applyTheme(theme) {
		requestedTheme = theme;
		themeTransition?.skipTransition();
		clearTimeout(themeTimer);
		const root = document.documentElement;
		delete root.dataset.themeChanging;
		delete root.dataset.themeAnimating;
		const update = () => { root.dataset.theme = requestedTheme; reflectTheme(); };
		if (reduce.matches) { update(); return; }
		if (typeof document.startViewTransition === 'function') {
			root.dataset.themeAnimating = 'true';
			const transition = document.startViewTransition(update);
			themeTransition = transition;
			transition.ready.catch(() => {});
			transition.finished.catch(() => {}).then(() => {
				if (themeTransition !== transition) return;
				themeTransition = undefined;
				delete root.dataset.themeAnimating;
			});
		} else {
			getComputedStyle(document.body).backgroundColor;
			root.dataset.themeChanging = 'true';
			getComputedStyle(document.body).backgroundColor;
			update();
			themeTimer = setTimeout(() => { delete root.dataset.themeChanging; }, 700);
		}
	}
	function reflectTheme() {
		const dark = document.documentElement.dataset.theme === 'dark';
		const heroImage = $('.hero-art img');
		if (heroImage && !heroImage.classList.contains('brand-image')) heroImage.src = dark ? 'assets/hero-dark.webp' : 'assets/hero.webp';
		themeToggle.setAttribute('aria-label', dark ? (document.documentElement.lang === 'en' ? 'Switch to light theme' : '切换为浅色显示') : (document.documentElement.lang === 'en' ? 'Switch to dark theme' : '切换为深色显示'));
		themeToggle.setAttribute('aria-pressed', String(dark));
	}
	themeToggle.addEventListener('click', () => {
		const theme = requestedTheme === 'dark' ? 'light' : 'dark';
		applyTheme(theme);
		try {
			localStorage.setItem('asam-prototype-theme', theme);
		} catch {
			/* Keep the active choice for this page. */
		}
		reflectTheme();
	});
	reflectTheme();
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
		let saved;
		try {
			saved = localStorage.getItem('asam-prototype-theme');
		} catch {
			/* Use system preference. */
		}
		if (!saved) {
			applyTheme(event.matches ? 'dark' : 'light');
			reflectTheme();
		}
	});

	const menuToggle = $('.menu-toggle');
	const menu = $('#mobile-nav');
	function closeMenu() {
		menu.hidden = true;
		menuToggle.setAttribute('aria-expanded', 'false');
		menuToggle.setAttribute('aria-label', (document.documentElement.lang === 'en' ? 'Open navigation' : '展开导航'));
	}
	menu.addEventListener('click', (event) => { if (event.target instanceof Element && event.target.closest('a[href]')) closeMenu(); });
	menuToggle.addEventListener('click', () => {
		const opening = menu.hidden;
		if (!opening) {
			closeMenu();
			return;
		}
		menu.hidden = false;
		menuToggle.setAttribute('aria-expanded', 'true');
		menuToggle.setAttribute('aria-label', (document.documentElement.lang === 'en' ? 'Close navigation' : '收起导航'));
		if (canAnimate())
			gsap.fromTo(
				$(':scope > a', menu),
				{ autoAlpha: 0, y: -5 },
				{ autoAlpha: 1, y: 0, duration: 0.23, stagger: 0.04, clearProps: 'all' }
			);
	});
	window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
		if (event.matches) closeMenu();
	});

	(function initializeSiteSearch(
	catalog,
	versionNavigation,
	englishDocuments,
	englishVersions,
	englishPreviews,
	closeMobileMenu
) {
	const dialog = document.querySelector('#search-dialog');
	if (!dialog) return;

	const form = dialog.querySelector('form');
	const field = form.querySelector('.search-field');
	const input = form.querySelector('input');
	input.id ||= 'global-search';
	const results = dialog.querySelector('#search-results');
	const status = dialog.querySelector('[data-search-status]');
	const historyPanel = dialog.querySelector('[data-search-history]');
	const historyList = dialog.querySelector('[data-search-queries]');
	const clearHistory = dialog.querySelector('[data-search-clear-history]');
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const easing = 'cubic-bezier(.22,.72,.24,1)';
	const entranceDuration = 210;
	const english = document.documentElement.lang === 'en';
	const historyKey = english ? 'asam-website-search-queries-en' : 'asam-website-search-queries';
	const translations = new Map(englishDocuments);
	const previews = new Map(
		englishPreviews.map(([href, title, target]) => [href, { title, target }])
	);
	const versionDescriptions = new Map(englishVersions.map((entry) => [entry[1], entry[2]]));
	const normalize = (value) =>
		String(value || '')
			.normalize('NFKC')
			.toLowerCase();
	const getTriggers = () => [...document.querySelectorAll('[data-open-search]')];
	const toResult = (label, title, category, description, href, extra = '') => {
		const url = english ? new URL(href, location.href) : null;
		const translated = url?.origin === location.origin ? translations.get(url.pathname) : '';
		const preview = english ? previews.get(href) : undefined;
		return {
			label: preview?.title || translated || label,
			title,
			category,
			href:
				preview?.target ||
				(translated ? '/en' + url.pathname + url.search + url.hash : href),
			chinese: english && !translated && !preview?.target,
			text: normalize(
				[preview?.title, translated, label, title, category, description, href, extra].join(
					' '
				)
			)
		};
	};

	const guides = [
		toResult(
			'开始使用',
			'安装与接入',
			'',
			'安装、本地 tarball、样式与组件接入',
			'/getting-started.html'
		),
		toResult('组件目录', '', '', '按分类浏览基础组件', '/component-catalog.html'),
		toResult(
			'设计系统',
			'主题与设计变量',
			'',
			'品牌色、主题、tokens 与 CSS variables',
			'/design-system.html'
		),
		toResult(
			'AI 接入',
			'Skill 与文档 MCP',
			'',
			'Skill 安装、Agent 接入、组件资料与可选 MCP',
			'/ai/index.html'
		),
		toResult('类型字典', '', '', 'UI 与 Pro 的公开类型定义与机器索引', '/type-dictionary.html'),
		...versionNavigation.map(([title, href, description]) =>
			toResult(title, '', '', description, href)
		)
	];
	if (english)
		guides.splice(
			0,
			guides.length,
			...englishDocuments.map(([href, title]) => {
				return toResult(title, '', '', versionDescriptions.get(href) || '', href);
			})
		);
	const columns = [
		{
			key: 'base',
			state: 'ready',
			items: catalog.map((item) =>
				toResult(
					item.label,
					item.name,
					item.category,
					item.description,
					item.path,
					item.tags
				)
			)
		},
		{
			key: 'pro',
			url: '/pro/components.json',
			state: 'idle',
			items: [],
			map: (data) =>
				data.components.map((item) =>
					toResult(item.title, item.name, item.category, item.description, item.route)
				)
		},
		{
			key: 'templates',
			url: '/pro/template-catalog.json',
			state: 'idle',
			items: [],
			map: (data) =>
				data.map((item) =>
					toResult(
						item.title,
						'',
						item.category,
						item.description,
						item.preview || item.documentation,
						item.id
					)
				)
		}
	];
	let history = [];
	try {
		const saved = JSON.parse(localStorage.getItem(historyKey));
		if (Array.isArray(saved))
			history = saved.filter((item) => typeof item === 'string').slice(0, 5);
	} catch {
		// Search also works when browser storage is unavailable.
	}
	let animation;
	let returnFocus;
	let origin;
	let oldOverflow;
	let closing = false;
	let restoringFocus = false;
	let entranceStarted;

	function animateEntrance(element, delay) {
		if (entranceStarted === undefined || !element) return;
		const entry = element.animate(
			[
				{ opacity: 0, transform: 'translateY(9px)' },
				{ opacity: 1, transform: 'none' }
			],
			{ delay, duration: entranceDuration, easing, fill: 'backwards' }
		);
		entry.id = 'site-search-entrance';
	}

	function finishEntrance() {
		if (entranceStarted === undefined) return;
		entranceStarted = undefined;
		for (const effect of results.getAnimations?.({ subtree: true }) || []) {
			if (effect.id === 'site-search-entrance') effect.cancel();
		}
	}

	function saveHistory() {
		try {
			localStorage.setItem(historyKey, JSON.stringify(history));
		} catch {
			// Keep recent queries in memory when browser storage is unavailable.
		}
	}

	function rememberQuery() {
		const query = input.value.trim();
		if (!query) return;
		history = [query, ...history.filter((item) => normalize(item) !== normalize(query))].slice(
			0,
			5
		);
		saveHistory();
	}

	function renderHistory() {
		historyPanel.hidden = Boolean(input.value.trim()) || !history.length;
		clearHistory.hidden = !history.length;
		historyList.replaceChildren(
			...history.map((query) => {
				const link = document.createElement('a');
				link.href = '#' + input.id;
				link.dataset.searchQuery = query;
				link.textContent = query;
				return link;
			})
		);
	}

	function renderResults(loadedColumn) {
		const focused = results.contains(document.activeElement) ? document.activeElement : null;
		const focusedHref = focused?.matches('.search-result')
			? focused.getAttribute('href')
			: null;
		const focusedQuery = focused?.dataset.searchQuery;
		const query = normalize(input.value).trim();
		const terms = query ? query.split(/\s+/) : [];
		const matches = (item) => terms.every((term) => item.text.includes(term));
		let total = 0;
		for (const [index, column] of columns.entries()) {
			const hits = column.items.filter(matches);
			const related = column.key === 'base' ? guides.filter(matches) : [];
			total += hits.length + related.length;
			if (loadedColumn && column !== loadedColumn) continue;
			const list = results.querySelector('[data-search-items="' + column.key + '"]');
			const count = results.querySelector('[data-search-count="' + column.key + '"]');
			const empty = results.querySelector('[data-search-empty="' + column.key + '"]');
			const shown = terms.length ? hits : hits.slice(0, 8);
			list.replaceChildren(...shown.map(renderResult));
			if (entranceStarted !== undefined) {
				const elapsed = performance.now() - entranceStarted;
				const delay = Math.max(0, 240 + index * 70 - elapsed);
				if (!loadedColumn) animateEntrance(list.previousElementSibling, delay);
				[...list.children].forEach((item, row) =>
					animateEntrance(item, delay + 90 + row * 34)
				);
			}
			const ready = column.state === 'ready';
			count.textContent = ready ? String(hits.length) : '';
			empty.hidden = ready && Boolean(hits.length || related.length);
			if (!empty.hidden) {
				empty.textContent = ready
					? english
						? 'No matching results'
						: '没有匹配结果'
					: column.state === 'error'
						? english
							? 'Search index unavailable. Browse the catalog.'
							: '索引加载失败，可打开目录浏览'
						: english
							? 'Loading search index…'
							: '正在加载搜索索引…';
			}
			if (column.key === 'base') {
				const documents = results.querySelector('[data-search-documents]');
				documents.hidden = !related.length;
				documents.querySelector('ul').replaceChildren(...related.map(renderResult));
			}
		}
		status.textContent = columns.some((column) => column.state === 'loading')
			? english
				? 'Loading search index'
				: '正在加载搜索索引'
			: query
				? english
					? total + (total === 1 ? ' result' : ' results')
					: '找到 ' + total + ' 个结果'
				: '';
		renderHistory();
		if ((focusedHref || focusedQuery) && !focused.isConnected) {
			const replacement = focusedHref
				? resultLinks().find((link) => link.getAttribute('href') === focusedHref)
				: [...historyList.children].find(
						(link) => link.dataset.searchQuery === focusedQuery
					);
			(replacement || input).focus({ preventScroll: true });
		}
	}

	function renderResult(item) {
		const row = document.createElement('li');
		const link = document.createElement('a');
		link.href = item.href;
		link.className = 'search-result';
		const text = document.createElement('span');
		const title = document.createElement('strong');
		title.textContent = item.label;
		if (item.chinese) title.lang = 'zh-CN';
		const details = document.createElement('small');
		details.textContent = [item.title, item.category, item.chinese ? 'Chinese' : '']
			.filter(Boolean)
			.join(' · ');
		if (item.chinese) link.hreflang = 'zh-CN';
		text.append(title, details);
		const arrow = document.createElement('span');
		arrow.className = 'result-arrow';
		arrow.textContent = '→';
		arrow.setAttribute('aria-hidden', 'true');
		link.append(text, arrow);
		row.append(link);
		return row;
	}

	async function loadColumn(column) {
		column.state = 'loading';
		try {
			const response = await fetch(column.url);
			if (!response.ok) throw new Error('Search index unavailable');
			column.items = column
				.map(await response.json())
				.filter((item) => item.label && /^\/(?!\/)/.test(item.href));
			column.state = 'ready';
		} catch {
			column.state = 'error';
		}
		if (dialog.open && !closing) renderResults(column);
	}

	function fieldFrame(element) {
		const style = getComputedStyle(element);
		return {
			rect: element.getBoundingClientRect(),
			backgroundColor: style.backgroundColor,
			borderColor: style.borderColor,
			borderRadius: style.borderRadius,
			boxShadow: style.boxShadow,
			fontSize: style.fontSize,
			gap: style.gap,
			padding: style.padding
		};
	}

	function stopMotion() {
		animation?.forEach((effect) => effect.cancel());
		animation = undefined;
	}

	function playMotion(opening, done = () => {}, collapsed) {
		const interrupted = animation && fieldFrame(field);
		const interruptedSurface = animation && getComputedStyle(dialog).backgroundColor;
		const interruptedResults = animation && getComputedStyle(results).opacity;
		const chrome = [
			dialog.querySelector('.site-search-top'),
			form.querySelector('button[type="submit"]'),
			dialog.querySelector('.site-search-footer')
		];
		const interruptedOpacity =
			animation && chrome.map((item) => getComputedStyle(item).opacity);
		stopMotion();
		if (motion.matches || !origin?.isConnected || typeof field.animate !== 'function') {
			done();
			return;
		}
		collapsed ??= fieldFrame(origin);
		const expanded = fieldFrame(field);
		const toKeyframe = ({ rect, ...style }) => ({
			...style,
			width: rect.width + 'px',
			height: rect.height + 'px',
			transform:
				'translate(' +
				(rect.left - expanded.rect.left) +
				'px, ' +
				(rect.top - expanded.rect.top) +
				'px)'
		});
		const duration = opening ? 380 : 260;
		const options = { duration, easing, fill: 'both' };
		const fieldMotion = field.animate(
			[
				toKeyframe(interrupted || (opening ? collapsed : expanded)),
				toKeyframe(opening ? expanded : collapsed)
			],
			options
		);
		const surface = getComputedStyle(dialog).backgroundColor;
		const surfaceMotion = dialog.animate(
			[
				{ backgroundColor: interruptedSurface || (opening ? 'transparent' : surface) },
				{ backgroundColor: opening ? surface : 'transparent' }
			],
			options
		);
		const chromeMotion = chrome.map((item, index) =>
			item.animate(
				[
					{ opacity: interruptedOpacity?.[index] ?? (opening ? 0 : 1) },
					{ opacity: opening ? 1 : 0 }
				],
				{ ...options, delay: opening ? 130 : 0, duration: 130 }
			)
		);
		if (!opening || (interruptedResults && interruptedResults !== '1')) {
			chromeMotion.push(
				results.animate(
					[{ opacity: interruptedResults || 1 }, { opacity: opening ? 1 : 0 }],
					{ ...options, duration: 130 }
				)
			);
		}
		const next = [fieldMotion, surfaceMotion, ...chromeMotion];
		animation = next;
		fieldMotion.finished.then(
			() => {
				if (animation !== next) return;
				stopMotion();
				done();
			},
			() => {}
		);
	}

	function open(trigger) {
		if (dialog.open) {
			if (closing) {
				closing = false;
				playMotion(true);
				input.focus({ preventScroll: true });
			}
			return;
		}
		const triggers = getTriggers();
		origin = triggers.includes(trigger)
			? trigger
			: triggers.find((button) => button.getClientRects().length);
		const collapsed = origin && fieldFrame(origin);
		returnFocus = trigger === document.body ? origin : trigger;
		oldOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		input.value = '';
		dialog.showModal();
		triggers.forEach((button) => button.setAttribute('aria-expanded', 'true'));
		input.focus({ preventScroll: true });
		results.scrollTop = 0;
		if (!motion.matches && typeof field.animate === 'function') {
			entranceStarted = performance.now();
		}
		columns.filter((column) => ['idle', 'error'].includes(column.state)).forEach(loadColumn);
		renderResults();
		playMotion(true, undefined, collapsed);
	}

	function finishClose(restoreFocus) {
		if (!dialog.open) return;
		stopMotion();
		finishEntrance();
		closing = false;
		restoringFocus = true;
		dialog.close();
		document.body.style.overflow = oldOverflow;
		getTriggers().forEach((button) => button.setAttribute('aria-expanded', 'false'));
		if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
		restoringFocus = false;
	}

	function close() {
		if (!dialog.open || closing) return;
		closing = true;
		finishEntrance();
		playMotion(false, () => finishClose(true));
	}

	const resultLinks = () => [...results.querySelectorAll('.search-result')];

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		if (!input.value.trim()) return;
		rememberQuery();
		resultLinks()[0]?.focus();
	});
	input.addEventListener('input', () => {
		finishEntrance();
		renderResults();
		results.scrollTop = 0;
	});
	dialog.querySelector('[data-close-dialog]').addEventListener('click', close);
	dialog.addEventListener('cancel', (event) => {
		event.preventDefault();
		close();
	});
	dialog.addEventListener('keydown', (event) => {
		if (event.isComposing) return;
		if (event.key === 'Escape') {
			// A search input normally consumes the first Escape to clear its value.
			event.preventDefault();
			event.stopPropagation();
			close();
			return;
		}
		if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
		const links = resultLinks();
		const position = links.indexOf(document.activeElement);
		if (!links.length || (document.activeElement !== input && position < 0)) return;
		event.preventDefault();
		const step = event.key === 'ArrowDown' ? 1 : -1;
		if (position === 0 && step < 0) {
			input.focus();
			return;
		}
		const next = position < 0 && step < 0 ? links.length - 1 : position + step;
		links[next % links.length].focus();
	});
	results.addEventListener('click', (event) => {
		const link = event.target.closest?.('.search-result, [data-search-browse]');
		if (
			!link ||
			event.button !== 0 ||
			event.ctrlKey ||
			event.metaKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		rememberQuery();
		finishClose(false);
	});
	results.addEventListener('focusin', finishEntrance);
	motion.addEventListener('change', () => {
		if (!motion.matches) return;
		stopMotion();
		finishEntrance();
		if (closing) finishClose(true);
	});
	historyList.addEventListener('click', (event) => {
		const link = event.target.closest?.('[data-search-query]');
		if (!link) return;
		event.preventDefault();
		input.value = link.dataset.searchQuery;
		renderResults();
		results.scrollTop = 0;
		input.focus();
	});
	clearHistory.addEventListener('click', () => {
		history = [];
		saveHistory();
		renderHistory();
		input.focus();
	});
	getTriggers().forEach((button) => {
		button.addEventListener('focus', () => {
			if (!restoringFocus) open(button);
		});
		button.addEventListener('click', () => open(button));
	});
	document.addEventListener('asam:page-leave', () => finishClose(false));
	document.addEventListener('keydown', (event) => {
		if (event.isComposing) return;
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			if (document.querySelector('dialog[open]') && !dialog.open) return;
			event.preventDefault();
			if (dialog.open && !closing) close();
			else open(document.activeElement);
		} else if (event.key === 'Escape') {
			closeMobileMenu();
		} else if (
			event.key === '/' &&
			!event.ctrlKey &&
			!event.metaKey &&
			!event.altKey &&
			!document.activeElement?.closest('input, textarea, select, [contenteditable]') &&
			!document.querySelector('dialog[open]')
		) {
			event.preventDefault();
			const filter = document.querySelector('#component-search');
			if (filter) filter.focus();
			else open(document.activeElement);
		}
	});
})(catalog, [["版本与兼容说明","/guide/compatibility.html","版本信息 推荐安装 Vue Element Plus peer"],["升级指南","/guide/upgrade.html","迁移 API 替换 破坏性变化 Tiptap"],["UI 更新日志","/guide/ui-changelog.html","基础组件 changelog 发布历史"],["Pro 更新日志","/guide/pro-changelog.html","高级组件 模板 changelog 发布历史"]], [["/ai/agent.html","Agent integration workflow"],["/ai/expert-codex.html","Codex Development Expert"],["/ai/expert-from-design.html","Build a page from images and examples"],["/ai/expert-harness.html","DeepSeek Harness Development Expert"],["/ai/expert-installation.html","Installation, updates, and removal"],["/ai/expert-pro-development.html","Pro project integration and version checks"],["/ai/expert-verification.html","Review and repair workflow"],["/ai/expert-workbuddy.html","WorkBuddy Development Expert"],["/ai/expert.html","Development Expert"],["/ai/index.html","Use an Agent to integrate ASAM UI"],["/ai/mcp.html","Documentation MCP"],["/ai/migrations/administration.html","Migrating the administration data model"],["/ai/migrations/desktop.html","Migrating a browser desktop layout"],["/ai/migrations/foundation.html","Migrating theme configuration"],["/ai/migrations/social.html","Migrating feed and comment data"],["/ai/pro.html","Pro resources"],["/ai/recipes/account.html","Account and Settings Pages"],["/ai/recipes/administration.html","Administration Pages"],["/ai/recipes/chatbot.html","Conversation Assistant"],["/ai/recipes/content-editor.html","Content Editing Fields"],["/ai/recipes/desktop.html","Browser Desktop Integration Recipe"],["/ai/recipes/details.html","Collaboration Record Queries and Details"],["/ai/recipes/editors.html","Document and Resource Editing Pages"],["/ai/recipes/field-modes.html","Field Modes and Conversion"],["/ai/recipes/form-flows.html","Filters, Drawers, and Step-by-Step Forms"],["/ai/recipes/forms.html","Data Entry and Step-by-Step Pages"],["/ai/recipes/foundation.html","Integrating base components"],["/ai/recipes/i18n.html","Application internationalization"],["/ai/recipes/lists.html","Lists and task cards"],["/ai/recipes/maps.html","Map pages"],["/ai/recipes/navigation.html","Application navigation"],["/ai/recipes/preferences.html","Preferences and persistence"],["/ai/recipes/results.html","Result and error pages"],["/ai/recipes/scaffold.html","Scaffolding and incremental integration"],["/ai/recipes/schema-form.html","Nested schema forms"],["/ai/recipes/search.html","Search result pages"],["/ai/recipes/security.html","Sessions and front-end permissions"],["/ai/recipes/social.html","Activity feeds and comments"],["/ai/recipes/structured-table.html","Tree tables, merged cells, and summaries"],["/ai/recipes/table-editing.html","Table editing and reordering"],["/ai/recipes/table-range.html","Table ranges and find and replace"],["/ai/recipes/table-transfer.html","Table transfer and data exchange"],["/ai/recipes/visualization.html","Charts and real-time monitoring"],["/ai/recipes/workbench.html","Workbenches"],["/ai/resources.html","Component references"],["/ai/skill.html","Install the integration Skill"],["/component-AsamAffix.html","Affix"],["/component-AsamAlert.html","Alert"],["/component-AsamAnchor.html","Anchor"],["/component-AsamAnchorLink.html","Anchor Link"],["/component-AsamAside.html","Aside"],["/component-AsamAutoResizer.html","Auto Resizer"],["/component-AsamAutocomplete.html","Autocomplete"],["/component-AsamAvatar.html","Avatar"],["/component-AsamAvatarGroup.html","Avatar Group"],["/component-AsamBacktop.html","Back to Top"],["/component-AsamBadge.html","Badge"],["/component-AsamBaseForm.html","Base form"],["/component-AsamBreadcrumb.html","Breadcrumb"],["/component-AsamBreadcrumbItem.html","Breadcrumb Item"],["/component-AsamButton.html","Button"],["/component-AsamButtonGroup.html","Button Group"],["/component-AsamCalendar.html","Calendar"],["/component-AsamCard.html","Card"],["/component-AsamCardList.html","Card List"],["/component-AsamCarousel.html","Carousel"],["/component-AsamCarouselItem.html","Carousel Item"],["/component-AsamCascader.html","Cascader"],["/component-AsamCascaderPanel.html","Cascader Panel"],["/component-AsamCheckTag.html","Check Tag"],["/component-AsamCheckbox.html","Checkbox"],["/component-AsamCheckboxButton.html","Checkbox Button"],["/component-AsamCheckboxGroup.html","Checkbox Group"],["/component-AsamCheckboxItem.html","Checkbox Item"],["/component-AsamClickOutside.html","Click Outside Directive"],["/component-AsamCol.html","Col"],["/component-AsamCollapse.html","Collapse"],["/component-AsamCollapseItem.html","Collapse Item"],["/component-AsamCollapseTransition.html","Collapse Transition"],["/component-AsamColorPicker.html","Color Picker"],["/component-AsamColorPickerPanel.html","Color Picker Panel"],["/component-AsamConfigProvider.html","Config Provider"],["/component-AsamContainer.html","Container"],["/component-AsamCountdown.html","Countdown"],["/component-AsamDataTable.html","Data Table"],["/component-AsamDatePicker.html","Date picker"],["/component-AsamDatePickerPanel.html","Date Picker Panel"],["/component-AsamDateTimePicker.html","Date-time picker compatibility alias"],["/component-AsamDateTimeRangePicker.html","Date-time range picker"],["/component-AsamDescriptions.html","Descriptions"],["/component-AsamDescriptionsItem.html","Descriptions Item"],["/component-AsamDialog.html","Dialog"],["/component-AsamDictCascader.html","Dictionary Cascader"],["/component-AsamDictCheckbox.html","Dictionary Checkbox Group"],["/component-AsamDictRadio.html","Dictionary Radio Group"],["/component-AsamDictSelect.html","Dictionary Select"],["/component-AsamDictSelectV2.html","Dictionary Virtualized Select"],["/component-AsamDictTreeSelect.html","Dictionary Tree Select"],["/component-AsamDivider.html","Divider"],["/component-AsamDrawer.html","Drawer"],["/component-AsamDropdown.html","Dropdown"],["/component-AsamDropdownItem.html","Dropdown Item"],["/component-AsamDropdownMenu.html","Dropdown Menu"],["/component-AsamDynamicSizeGrid.html","Dynamic Size Grid"],["/component-AsamDynamicSizeList.html","Dynamic Size List"],["/component-AsamEditor.html","Rich Text Editor"],["/component-AsamEmpty.html","Empty"],["/component-AsamFixedSizeGrid.html","Fixed Size Grid"],["/component-AsamFixedSizeList.html","Fixed Size List"],["/component-AsamFooter.html","Footer"],["/component-AsamForm.html","Data form"],["/component-AsamFormActions.html","Form Actions"],["/component-AsamFormGrid.html","Form Grid"],["/component-AsamFormItem.html","Form Item"],["/component-AsamFormSection.html","Form Section"],["/component-AsamHeader.html","Header"],["/component-AsamIcon.html","Icon"],["/component-AsamImage.html","Image"],["/component-AsamImageViewer.html","Image Viewer"],["/component-AsamInfiniteScroll.html","Infinite Scroll Directive"],["/component-AsamInput.html","Input"],["/component-AsamInputNumber.html","Number input"],["/component-AsamInputOtp.html","Input OTP"],["/component-AsamInputTag.html","Input Tag"],["/component-AsamLink.html","Link"],["/component-AsamLoading.html","Loading"],["/component-AsamLoadingDirective.html","Loading Directive"],["/component-AsamLoadingService.html","Loading Service"],["/component-AsamMain.html","Main"],["/component-AsamMention.html","Mention"],["/component-AsamMenu.html","Menu"],["/component-AsamMenuItem.html","Menu Item"],["/component-AsamMenuItemGroup.html","Menu Item Group"],["/component-AsamMessage.html","Message"],["/component-AsamMessageBox.html","Message Box"],["/component-AsamMousewheel.html","Mouse Wheel Directive"],["/component-AsamNotification.html","Notification"],["/component-AsamOption.html","Option"],["/component-AsamOptionGroup.html","Option Group"],["/component-AsamOverlay.html","Overlay"],["/component-AsamPageHeader.html","Page Header"],["/component-AsamPagination.html","Pagination"],["/component-AsamPassword.html","Password"],["/component-AsamPopconfirm.html","Popconfirm"],["/component-AsamPopover.html","Popover"],["/component-AsamPopoverDirective.html","Popover Directive"],["/component-AsamPopper.html","Popper"],["/component-AsamPopperArrow.html","Popper Arrow"],["/component-AsamPopperContent.html","Popper Content"],["/component-AsamPopperTrigger.html","Popper Trigger"],["/component-AsamProgress.html","Progress"],["/component-AsamRadio.html","Radio"],["/component-AsamRadioButton.html","Radio Button"],["/component-AsamRadioGroup.html","Radio Group"],["/component-AsamRadioItem.html","Radio Item"],["/component-AsamRate.html","Rate"],["/component-AsamRemoteAutocomplete.html","Remote Autocomplete"],["/component-AsamRemoteCascader.html","Remote Cascader"],["/component-AsamRemoteCheckbox.html","Remote Checkbox Group"],["/component-AsamRemoteRadio.html","Remote Radio Group"],["/component-AsamRemoteSelect.html","Remote Select"],["/component-AsamRemoteSelectV2.html","Remote Virtualized Select"],["/component-AsamRemoteTreeSelect.html","Remote Tree Select"],["/component-AsamResult.html","Result"],["/component-AsamRow.html","Row"],["/component-AsamScrollbar.html","Scrollbar"],["/component-AsamSegmented.html","Segmented"],["/component-AsamSelect.html","Select"],["/component-AsamSelectV2.html","Virtual select"],["/component-AsamSkeleton.html","Skeleton"],["/component-AsamSkeletonItem.html","Skeleton Item"],["/component-AsamSlider.html","Slider"],["/component-AsamSpace.html","Space"],["/component-AsamSplitter.html","Splitter"],["/component-AsamSplitterPanel.html","Splitter Panel"],["/component-AsamStatistic.html","Statistic"],["/component-AsamStep.html","Step"],["/component-AsamSteps.html","Steps"],["/component-AsamSubMenu.html","Submenu"],["/component-AsamSwitch.html","Switch"],["/component-AsamTabPane.html","Tab Pane"],["/component-AsamTable.html","Table"],["/component-AsamTableColumn.html","Table Column"],["/component-AsamTableV2.html","Virtualized Table"],["/component-AsamTabs.html","Tabs"],["/component-AsamTag.html","Tag"],["/component-AsamTaskCard.html","Task Card"],["/component-AsamText.html","Text"],["/component-AsamTextarea.html","Textarea"],["/component-AsamTimePicker.html","Time picker"],["/component-AsamTimeSelect.html","Time Select"],["/component-AsamTimeline.html","Timeline"],["/component-AsamTimelineItem.html","Timeline Item"],["/component-AsamTooltip.html","Tooltip"],["/component-AsamTour.html","Tour"],["/component-AsamTourStep.html","Tour Step"],["/component-AsamTransfer.html","Transfer"],["/component-AsamTrapFocus.html","Focus Trap Directive"],["/component-AsamTree.html","Tree"],["/component-AsamTreeSelect.html","Tree select"],["/component-AsamTreeV2.html","Virtualized Tree"],["/component-AsamUpload.html","Upload"],["/component-AsamWatermark.html","Watermark"],["/component-catalog.html","Component catalog"],["/component-vAsamLoading.html","vAsamLoading"],["/component-vAsamRepeatClick.html","Repeat Click Directive"],["/design-system.html","One language, a consistent experience"],["/getting-started.html","Getting started"],["/guide/architecture.html","Architecture and boundaries"],["/guide/compatibility.html","Versions and compatibility"],["/guide/contracts.html","Union types and forwarded contracts"],["/guide/data-driven.html","Data-driven components"],["/guide/installation.html","Installation and integration"],["/guide/pro-changelog.html","Pro changelog"],["/guide/provider.html","Data provider"],["/guide/site.html","Website build and access"],["/guide/theme.html","Themes and CSS variables"],["/guide/ui-changelog.html","UI changelog"],["/guide/upgrade.html","Upgrade guide"],["/index.html","ASAM UI"],["/pro/account-center.html","Account center"],["/pro/admin-access.html","Administrator-only page"],["/pro/advanced-profile.html","Advanced details"],["/pro/analysis-workspace.html","Analysis workspace"],["/pro/application.html","Application capabilities"],["/pro/application/composables/environment.html","Browser environment"],["/pro/application/composables/on-mounted-or-activated.html","onMountedOrActivated"],["/pro/application/composables/raf.html","Animation frame helpers"],["/pro/application/composables/use-click-away.html","useClickAway"],["/pro/application/composables/use-count-down.html","useCountDown"],["/pro/application/composables/use-custom-field-value.html","Custom field values"],["/pro/application/composables/use-event-listener.html","useEventListener"],["/pro/application/composables/use-page-visibility.html","usePageVisibility"],["/pro/application/composables/use-raf.html","useRaf"],["/pro/application/composables/use-rect.html","useRect"],["/pro/application/composables/use-relation.html","Parent and child relations"],["/pro/application/composables/use-scroll-parent.html","useScrollParent and getScrollParent"],["/pro/application/composables/use-toggle.html","useToggle"],["/pro/application/composables/use-window-size.html","useWindowSize"],["/pro/applications.html","Application search results"],["/pro/articles.html","Article search results"],["/pro/basic-list.html","Standard list"],["/pro/basic-profile.html","Basic details"],["/pro/card-list.html","Card list"],["/pro/chatbot.html","Conversation assistant"],["/pro/component-AsamActionBar.html","Action bar"],["/pro/component-AsamAdminLayout.html","Admin layout"],["/pro/component-AsamApplicationProvider.html","Application configuration provider"],["/pro/component-AsamCardGroup.html","Card group"],["/pro/component-AsamCardList.html","Card list"],["/pro/component-AsamChoiceCard.html","Choice card"],["/pro/component-AsamChoiceGroup.html","Choice group"],["/pro/component-AsamContentEditor.html","Content editor"],["/pro/component-AsamContentGrid.html","Content grid"],["/pro/component-AsamCountTo.html","Animated number"],["/pro/component-AsamCrudPage.html","CRUD page"],["/pro/component-AsamDetailDialog.html","Detail dialog"],["/pro/component-AsamDetailDrawer.html","Detail drawer"],["/pro/component-AsamDetailPanel.html","Detail panel"],["/pro/component-AsamDisplayCard.html","Display card"],["/pro/component-AsamEditableTable.html","Editable table"],["/pro/component-AsamEditorForm.html","Editor form"],["/pro/component-AsamErrorBoundary.html","Error boundary"],["/pro/component-AsamException.html","Exception page"],["/pro/component-AsamField.html","Semantic field"],["/pro/component-AsamFieldAnnotation.html","Field annotation"],["/pro/component-AsamFieldView.html","Field mode view"],["/pro/component-AsamFilterPopover.html","Filter popover"],["/pro/component-AsamFooter.html","Footer"],["/pro/component-AsamFormDialog.html","Edit dialog"],["/pro/component-AsamFormDrawer.html","Edit drawer"],["/pro/component-AsamGuidedTour.html","Guided tour"],["/pro/component-AsamHelpPanel.html","Contextual help"],["/pro/component-AsamLayoutSettings.html","Layout settings"],["/pro/component-AsamListRowActions.html","Standalone list row actions"],["/pro/component-AsamLoginForm.html","Login form"],["/pro/component-AsamLoginPage.html","Login page"],["/pro/component-AsamNotificationMenu.html","Notification menu"],["/pro/component-AsamNotificationPanel.html","Notification panel"],["/pro/component-AsamNumberDisplay.html","Number display"],["/pro/component-AsamOperationsTable.html","CRUD table and pagination"],["/pro/component-AsamPageContainer.html","Page container"],["/pro/component-AsamPageSkeleton.html","Page skeleton"],["/pro/component-AsamPageWatermark.html","Page watermark"],["/pro/component-AsamPermission.html","Frontend permission display"],["/pro/component-AsamProAvatarGroup.html","Member avatar group"],["/pro/component-AsamProCalendar.html","Calendar with date selection"],["/pro/component-AsamProCountdown.html","Countdown"],["/pro/component-AsamProList.html","Pro list"],["/pro/component-AsamProTaskCard.html","Pro task card"],["/pro/component-AsamProVirtualTable.html","Pro virtual table"],["/pro/component-AsamRelativeTime.html","Relative time"],["/pro/component-AsamResourceField.html","Resource field"],["/pro/component-AsamSchemaForm.html","Schema form"],["/pro/component-AsamSearchForm.html","Search form"],["/pro/component-AsamSortableTable.html","Sortable editable table"],["/pro/component-AsamStatePanel.html","State panel"],["/pro/component-AsamStatisticCard.html","Statistic card"],["/pro/component-AsamStepsForm.html","Multi-step form"],["/pro/component-AsamStructuredTable.html","Structured table"],["/pro/component-AsamTableRange.html","Table range"],["/pro/component-AsamTableTransfer.html","Table data transfer"],["/pro/component-AsamTextEllipsis.html","Collapsible text"],["/pro/component-AsamTrend.html","Trend display"],["/pro/component-AsamWordCount.html","Text length counter"],["/pro/components.html","Advanced components"],["/pro/fail-result.html","Failure result"],["/pro/i18n.html","Unified language and internationalization"],["/pro/index.html","ASAM UI Pro"],["/pro/installation.html","Quick start"],["/pro/login-workspace.html","Login workspace"],["/pro/monitor-workspace.html","Monitoring workspace"],["/pro/projects.html","Project search results"],["/pro/register.html","Registration workspace"],["/pro/registration-result.html","Registration result"],["/pro/settings-complete.html","Complete personal settings"],["/pro/settings-workspace.html","Personal settings"],["/pro/success-result.html","Success result"],["/pro/table-list.html","Query table"],["/pro/templates.html","Page templates"],["/pro/v2-024.html","CRUD page"],["/pro/v2-032.html","Application navigation"],["/pro/v2-033.html","Sessions and front-end permissions"],["/pro/v2-034.html","Preferences and persistence"],["/pro/v2-035.html","Requests and error feedback"],["/pro/v2-036.html","Application scaffold"],["/pro/v2-037.html","Charts and live monitoring"],["/pro/v2-038.html","Task workbench"],["/pro/v2-039.html","Data entry and step-by-step forms"],["/pro/v2-040.html","Collaboration records and details"],["/pro/v2-041.html","Search and responsive card lists"],["/pro/v2-042.html","Account and settings pages"],["/pro/v2-043.html","Administration template"],["/pro/v2-044.html","Result and exception pages"],["/pro/v2-045.html","Document editing"],["/pro/v2-047.html","Social feed and comments"],["/pro/v2-048.html","Maps"],["/pro/v2-049.html","Browser desktop"],["/pro/v2-053.html","Base component contracts and theme migration"],["/pro/versions.html","Versions and migration"],["/pro/welcome.html","Application welcome page"],["/pro/workplace-workspace.html","Workplace dashboard"],["/theme.html","Interactive theme and control sizes"]], [["Versions and compatibility","/guide/compatibility.html","Release status and peer dependencies"],["Upgrade guide","/guide/upgrade.html","Migration steps and breaking changes"],["UI changelog","/guide/ui-changelog.html","Base component release history"],["Pro changelog","/guide/pro-changelog.html","Pro components and template release history"]], [["/pro/monitor-workspace-preview.html?example=monitor-workspace","Monitoring dashboard","/pro/monitor-workspace-preview.html?example=monitor-workspace&locale=en"],["/pro/analysis-workspace-preview.html?example=analysis-workspace","Analytics dashboard","/pro/analysis-workspace-preview.html?example=analysis-workspace&locale=en"],["/pro/template-preview.html?example=administration","Administration","/pro/template-preview.html?example=administration&locale=en"],["/pro/template-preview.html?example=social","Activity feed and comments","/pro/template-preview.html?example=social&locale=en"],["/pro/template-preview.html?example=crud","CRUD page","/pro/template-preview.html?example=crud&locale=en"],["/pro/welcome-preview.html?example=welcome","Welcome page","/pro/welcome-preview.html?example=welcome&locale=en"],["/pro/cards-preview.html?example=visualization","Charts and live monitoring","/pro/cards-preview.html?example=visualization&locale=en"],["/pro/template-preview.html?example=workbench","Task workbench","/pro/template-preview.html?example=workbench&locale=en"],["/pro/template-preview.html?example=forms","Data entry and step-by-step form","/pro/template-preview.html?example=forms&locale=en"],["/pro/template-preview.html?example=details","Collaboration records and details","/pro/template-preview.html?example=details&locale=en"],["/pro/cards-preview.html?example=search","Search page","/pro/cards-preview.html?example=search&locale=en"],["/pro/cards-preview.html?example=search&kind=cards","Card list","/pro/cards-preview.html?example=search&kind=cards&locale=en"],["/pro/cards-preview.html?example=search&kind=projects","Project search","/pro/cards-preview.html?example=search&kind=projects&locale=en"],["/pro/cards-preview.html?example=search&kind=applications","Application search","/pro/cards-preview.html?example=search&kind=applications&locale=en"],["/pro/template-preview.html?example=account&family=minimal","Account and settings · Minimal","/pro/template-preview.html?example=account&family=minimal&locale=en"],["/pro/template-preview.html?example=account&family=brand","Account and settings · Brand panel","/pro/template-preview.html?example=account&family=brand&locale=en"],["/pro/template-preview.html?example=account&family=tech","Account and settings · Dark technology","/pro/template-preview.html?example=account&family=tech&locale=en"],["/pro/login-workspace-preview.html?example=login-workspace","Sign-in workspace","/pro/login-workspace-preview.html?example=login-workspace&locale=en"],["/pro/settings-workspace-preview.html?example=settings-workspace","Personal settings","/pro/settings-workspace-preview.html?example=settings-workspace&locale=en"],["/pro/registration-result-preview.html?example=registration-result","Registration result","/pro/registration-result-preview.html?example=registration-result&locale=en"],["/pro/results-preview.html?example=results&family=minimal","Result and exception pages · Minimal","/pro/results-preview.html?example=results&family=minimal&locale=en"],["/pro/results-preview.html?example=results&family=brand","Result and exception pages · Brand panel","/pro/results-preview.html?example=results&family=brand&locale=en"],["/pro/results-preview.html?example=results&family=tech","Result and exception pages · Dark technology","/pro/results-preview.html?example=results&family=tech&locale=en"],["/pro/template-preview.html?example=editor-pages","Document editing","/pro/template-preview.html?example=editor-pages&locale=en"],["/pro/template-preview.html?example=maps","Maps","/pro/template-preview.html?example=maps&locale=en"],["/pro/template-preview.html?example=desktop","Browser desktop layouts","/pro/template-preview.html?example=desktop&locale=en"],["/pro/workplace-workspace-preview.html?example=workplace-workspace","Team workbench","/pro/workplace-workspace-preview.html?example=workplace-workspace&locale=en"],["/pro/basic-profile-preview.html?example=basic-profile","Basic details","/pro/basic-profile-preview.html?example=basic-profile&locale=en"],["/pro/advanced-profile-preview.html?example=advanced-profile","Advanced details","/pro/advanced-profile-preview.html?example=advanced-profile&locale=en"],["/pro/account-center-preview.html?example=account-center","Account center","/pro/account-center-preview.html?example=account-center&locale=en"],["/pro/chatbot-preview.html?example=chatbot","Conversation assistant","/pro/chatbot-preview.html?example=chatbot&locale=en"],["/pro/success-result-preview.html?example=success-result","Success result","/pro/success-result-preview.html?example=success-result&locale=en"],["/pro/fail-result-preview.html?example=fail-result","Failure result","/pro/fail-result-preview.html?example=fail-result&locale=en"],["/pro/settings-complete-preview.html?example=settings-complete","Complete personal settings","/pro/settings-complete-preview.html?example=settings-complete&locale=en"],["/pro/register-preview.html?example=register-workspace","Registration","/pro/register-preview.html?example=register-workspace&locale=en"],["/pro/admin-access-preview.html?example=admin-access","Administrator-only page","/pro/admin-access-preview.html?example=admin-access&locale=en"],["/pro/articles-preview.html?example=articles","Article search results","/pro/articles-preview.html?example=articles&locale=en"],["/pro/projects-preview.html?example=projects","Project search results","/pro/projects-preview.html?example=projects&locale=en"],["/pro/applications-preview.html?example=applications","Application search results","/pro/applications-preview.html?example=applications&locale=en"],["/pro/basic-list-preview.html?example=basic-list","Standard list","/pro/basic-list-preview.html?example=basic-list&locale=en"],["/pro/table-list-preview.html?example=table-list","Query table","/pro/table-list-preview.html?example=table-list&locale=en"],["/pro/card-list-preview.html?example=card-list","Card list","/pro/card-list-preview.html?example=card-list&locale=en"]], () => {
		if (!menu.hidden) { closeMenu(); menuToggle.focus(); }
	});

	document.addEventListener('click', (event) => {
		const button = event.target instanceof Element ? event.target.closest('[data-manager]') : null;
		if (!button) return;
			$$('[data-manager]').forEach((item) =>
				item.setAttribute('aria-pressed', String(item === button))
			);
			const manager = button.dataset.manager;
			$('#install-code').textContent =
				`${manager} ${manager === 'npm' ? 'install' : 'add'} ./vendor/asam-ui-ui-0.1.0-alpha.1.tgz`;
	});


	const pageCleanups = [];
	const cleanupPage = () => { for (const cleanup of pageCleanups.splice(0)) cleanup(); };
	function initializePage() {
	cleanupPage();
	reflectTheme();
	// Each sequence explains hierarchy, feedback, or the transition to a new content group.
	// Static content remains visible if GSAP fails to load; no CSS initially hides content.
	if (window.gsap && window.ScrollTrigger && document.body.dataset.homeMotion !== 'enhanced') {
		gsap.registerPlugin(ScrollTrigger);
		const media = gsap.matchMedia();
		media.add('(prefers-reduced-motion: no-preference)', () => {
			if ($('.hero')) {
				gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.7 } })
					.from('.hero-enter', { y: 20, autoAlpha: 0, stagger: 0.1, clearProps: 'all' })
					.from(
						'.hero-art',
						{ y: 25, autoAlpha: 0, scale: 0.96, duration: 0.95, clearProps: 'all' },
						0.15
					);
			}
			$$('[data-reveal]').forEach((element) => {
				gsap.from(element, {
					y: 22,
					autoAlpha: 0,
					duration: 0.6,
					ease: 'power2.out',
					clearProps: 'all',
					scrollTrigger: { trigger: element, start: 'top 91%', once: true }
				});
			});
			if ($('.page-heading'))
				gsap.from('.page-heading', {
					y: 12,
					autoAlpha: 0,
					duration: 0.45,
					clearProps: 'all'
				});
		});
		// A small scroll-linked shift reveals the relationship between the three token samples.
		media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
			if (!$('.token-composition')) return;
			gsap.from('.tilt-token-small, .token-small:not([data-tilt-surface])', {
				y: 25,
				ease: 'none',
				scrollTrigger: {
					trigger: '.token-composition',
					start: 'top 88%',
					end: 'center 55%',
					scrub: 0.6
				}
			});
			gsap.from('.tilt-token-radius, .token-radius:not([data-tilt-surface])', {
				y: 40,
				ease: 'none',
				scrollTrigger: {
					trigger: '.token-composition',
					start: 'top 88%',
					end: 'center 55%',
					scrub: 0.6
				}
			});
		});
		pageCleanups.push(() => media.revert());
	}
	const headings = $$('.doc-section[id]');
	if (headings.length && $('.page-toc')) {
		const observer = new IntersectionObserver(
			(entries) =>
				entries.forEach((entry) => {
					if (entry.isIntersecting)
						$$('.page-toc a').forEach((link) =>
							link.classList.toggle('active', link.hash === `#${entry.target.id}`)
						);
				}),
			{ rootMargin: '-100px 0px -55% 0px' }
		);
		headings.forEach((heading) => observer.observe(heading));
		pageCleanups.push(() => observer.disconnect());
	}
	}
	document.addEventListener('asam:page-leave', cleanupPage);
	document.addEventListener('asam:page-enter', initializePage);
	window.addEventListener('pagehide', cleanupPage);
	window.addEventListener('pageshow', (event) => { if (event.persisted) initializePage(); });
	initializePage();
})();

};
if (document.documentElement.dataset.asamDocumentControls === 'ready') initialize();
else document.addEventListener('asam:document-controls-ready', initialize, { once: true });
})();
