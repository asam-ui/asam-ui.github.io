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
			notify('已复制到剪贴板');
		} catch {
			notify('复制未完成，请手动选择并复制文本');
		}
	}
	$$('[data-copy]').forEach((button) =>
		button.addEventListener('click', () =>
			copy(document.getElementById(button.dataset.copy).textContent)
		)
	);
	$$('[data-copy-value]').forEach((button) =>
		button.addEventListener('click', () => copy(button.dataset.copyValue))
	);
	const themeToggle = $('.theme-toggle');
	function reflectTheme() {
		const dark = document.documentElement.dataset.theme === 'dark';
		const heroImage = $('.hero-art img');
		if (heroImage && !heroImage.classList.contains('brand-image')) heroImage.src = dark ? 'assets/hero-dark.webp' : 'assets/hero.webp';
		themeToggle.setAttribute('aria-label', dark ? '切换为浅色显示' : '切换为深色显示');
		themeToggle.setAttribute('aria-pressed', String(dark));
	}
	themeToggle.addEventListener('click', () => {
		const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
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
			document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
			reflectTheme();
		}
	});

	const menuToggle = $('.menu-toggle');
	const menu = $('#mobile-nav');
	function closeMenu() {
		menu.hidden = true;
		menuToggle.setAttribute('aria-expanded', 'false');
		menuToggle.setAttribute('aria-label', '展开导航');
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
		menuToggle.setAttribute('aria-label', '收起导航');
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

	const dialogTriggers = new WeakMap();
	function openDialog(dialog, trigger) {
		if (dialog.open) return;
		dialogTriggers.set(dialog, trigger || document.activeElement);
		dialog.showModal();
		document.body.style.overflow = 'hidden';
		if (canAnimate())
			gsap.fromTo(
				dialog,
				{ opacity: 0, y: 10, scale: 0.985 },
				{ opacity: 1, y: 0, scale: 1, duration: 0.22, clearProps: 'opacity,transform' }
			);
	}
	$$('dialog').forEach((dialog) => {
		$('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
		dialog.addEventListener('click', (event) => {
			if (event.target !== dialog) return;
			const rect = dialog.getBoundingClientRect();
			if (
				event.clientX < rect.left ||
				event.clientX > rect.right ||
				event.clientY < rect.top ||
				event.clientY > rect.bottom
			)
				dialog.close();
		});
		dialog.addEventListener('close', () => {
			if (!$('dialog[open]')) {
				document.body.style.overflow = '';
				const trigger = dialogTriggers.get(dialog);
				if (trigger?.isConnected) trigger.focus({ preventScroll: true });
			}
		});
	});

	const searchDialog = $('#search-dialog');
	const search = $('#global-search');
	searchDialog.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		// A search input otherwise consumes the first Escape to clear its value.
		event.preventDefault();
		event.stopPropagation();
		searchDialog.close();
	});
	const guides = [
		{
			label: '开始使用',
			description: '安装、本地 tarball、样式与组件接入',
			url: '/getting-started.html'
		},
		{ label: '组件目录', description: '50 个已列组件，按分类浏览', url: '/component-catalog.html' },
{ label: 'AI 接入', description: 'Skill 安装、Agent 接入、组件资料与可选 MCP', url: '/ai/index.html' },
		{
			label: '设计系统',
			description: '品牌色、主题、tokens 与 CSS variables',
			url: '/design-system.html'
		}
	];
	const index = [
		...guides,
		...catalog.map((item) => ({
			label: item.label,
			description: `${item.name} / ${item.group}`,
			url: `/component-${item.name}.html`
		}))
	];
	function searchResults() {
		const query = search.value.trim().toLowerCase();
		const results = (
			query
				? index.filter((item) =>
						`${item.label} ${item.description}`.toLowerCase().includes(query)
					)
				: index.slice(0, 6)
		).slice(0, 10);
		const container = $('#search-results');
		container.replaceChildren();
		if (!results.length) {
			const empty = document.createElement('p');
			empty.className = 'search-no-result';
			empty.textContent = '没有找到匹配结果。试试组件英文名或“主题”。';
			container.append(empty);
			return;
		}
		for (const result of results) {
			const link = document.createElement('a');
			link.href = window.asamConceptLink ? window.asamConceptLink(result.url) : result.url;
			link.className = 'search-result';
			const text = document.createElement('span');
			const title = document.createElement('strong');
			title.textContent = result.label;
			const sub = document.createElement('small');
			sub.textContent = result.description;
			text.append(title, sub);
			const arrow = document.createElement('span');
			arrow.className = 'result-arrow';
			arrow.textContent = '↗';
			arrow.setAttribute('aria-hidden', 'true');
			link.append(text, arrow);
			link.addEventListener('click', () => searchDialog.close());
			container.append(link);
		}
	}
	search.addEventListener('input', searchResults);
	function showSearch(trigger) {
		search.value = '';
		searchResults();
		openDialog(searchDialog, trigger);
		search.focus();
	}
	$$('[data-open-search]').forEach((button) =>
		button.addEventListener('click', () => showSearch(button))
	);
	document.addEventListener('keydown', (event) => {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			if ($('dialog[open]') && !searchDialog.open) return;
			if (searchDialog.open) searchDialog.close();
			else showSearch(document.activeElement);
		}
		if (event.key === 'Escape' && !menu.hidden) {
			closeMenu();
			menuToggle.focus();
		}
		if (
			event.key === '/' &&
			!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) &&
			!$('dialog[open]')
		) {
			event.preventDefault();
			if ($('#component-search')) $('#component-search').focus();
			else showSearch(document.activeElement);
		}
	});

	$$('[data-manager]').forEach((button) =>
		button.addEventListener('click', () => {
			$$('[data-manager]').forEach((item) =>
				item.setAttribute('aria-pressed', String(item === button))
			);
			const manager = button.dataset.manager;
			$('#install-code').textContent =
				`${manager} ${manager === 'npm' ? 'install' : 'add'} ./vendor/asam-ui-ui-0.1.0-alpha.1.tgz`;
		})
	);


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
		window.addEventListener('pagehide', () => media.revert());
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
		window.addEventListener('pagehide', () => observer.disconnect());
	}
})();
