(() => {
	const wideScreen = matchMedia('(min-width: 1400px)');
	let preference = null;
	try {
		const stored = localStorage.getItem('asam-website-wide');
		if (stored === 'true' || stored === 'false') preference = stored === 'true';
	} catch {
		/* Storage can be unavailable. */
	}
	let wide = preference ?? wideScreen.matches;
	const reflectWidth = () => {
		document.documentElement.dataset.wide = String(wide);
		for (const button of document.querySelectorAll('.website-wide-toggle')) {
			const label =
				document.documentElement.lang === 'en'
					? wide
						? 'Disable wide layout'
						: 'Enable wide layout'
					: wide
						? '退出宽屏模式'
						: '开启宽屏模式';
			button.setAttribute('aria-pressed', String(wide));
			button.setAttribute('aria-label', label);
			button.setAttribute('title', label);
		}
	};
	reflectWidth();
	wideScreen.addEventListener('change', () => {
		if (preference !== null) return;
		wide = wideScreen.matches;
		reflectWidth();
	});
	const initialized = new WeakSet();
	const revealNote = () => {
		let target;
		try {
			target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
		} catch {
			return;
		}
		if (!target?.closest('details')) return;
		for (let parent = target; parent; parent = parent.parentElement)
			if (parent instanceof HTMLDetailsElement) parent.open = true;
		target.scrollIntoView();
	};
	document.addEventListener('click', (event) => {
		const link = event.target.closest('a[href^="#api-note-"]');
		if (link) requestAnimationFrame(revealNote);
	});
	window.addEventListener('hashchange', revealNote);
	const outlineSections = new Map();
	let outlineCurrent;
	let outlineFrame;
	const setOutlineCurrent = (current) => {
		if (current === outlineCurrent) return;
		for (const link of outlineSections.get(outlineCurrent) ?? [])
			link.removeAttribute('aria-current');
		for (const link of outlineSections.get(current) ?? [])
			link.setAttribute('aria-current', 'location');
		outlineCurrent = current;
	};
	const scheduleOutlineUpdate = () => {
		if (!outlineSections.size || outlineFrame) return;
		outlineFrame = requestAnimationFrame(() => {
			outlineFrame = undefined;
			const scroller = document.scrollingElement;
			const atBottom =
				scrollY > 0 && Math.ceil(scrollY + innerHeight) >= scroller.scrollHeight;
			const padding = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
			let current;
			for (const heading of outlineSections.keys()) {
				if (!heading.getClientRects().length) continue;
				const top = heading.getBoundingClientRect().top;
				const margin = parseFloat(getComputedStyle(heading).scrollMarginTop) || 0;
				if (top > (atBottom ? innerHeight : padding + margin + 1)) break;
				current = heading;
			}
			setOutlineCurrent(current);
		});
	};
	const outlineResize = new ResizeObserver(scheduleOutlineUpdate);
	const clearOutline = () => {
		cancelAnimationFrame(outlineFrame);
		outlineFrame = undefined;
		setOutlineCurrent(undefined);
		outlineResize.disconnect();
		outlineSections.clear();
	};
	const initializeOutline = () => {
		clearOutline();
		const main = document.querySelector('.site-doc-layout > #main');
		if (!main) return;
		for (const link of document.querySelectorAll(
			'.page-toc a[href^="#"], .mobile-page-toc a[href^="#"]'
		)) {
			const heading = document.getElementById(link.getAttribute('href').slice(1));
			if (!main.contains(heading)) continue;
			if (!outlineSections.has(heading)) outlineSections.set(heading, []);
			outlineSections.get(heading).push(link);
		}
		if (outlineSections.size) outlineResize.observe(main);
		scheduleOutlineUpdate();
	};
	window.addEventListener('scroll', scheduleOutlineUpdate, { passive: true });
	window.addEventListener('resize', scheduleOutlineUpdate);
	window.addEventListener('hashchange', scheduleOutlineUpdate);
	document.addEventListener('asam:page-leave', clearOutline);
	const initialize = () => {
		try {
			const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
			if (target instanceof HTMLDetailsElement) target.open = true;
		} catch {
			/* 无效片段不影响文档阅读。 */
		}

		revealNote();
		initializeOutline();
		for (const trigger of document.querySelectorAll('.cd-enum-trigger')) {
			if (initialized.has(trigger)) continue;
			initialized.add(trigger);
			const popup = document.getElementById(trigger.getAttribute('popovertarget'));
			const position = () => {
				const anchor = trigger.getBoundingClientRect();
				const box = popup.getBoundingClientRect();
				popup.style.left = `${Math.max(16, Math.min(anchor.left, innerWidth - box.width - 16))}px`;
				popup.style.top = `${Math.max(16, anchor.bottom + 8 + box.height > innerHeight ? anchor.top - box.height - 8 : anchor.bottom + 8)}px`;
			};
			const show = () => {
				popup.showPopover();
				position();
			};
			const hide = () => {
				setTimeout(() => {
					if (!trigger.matches(':focus, :hover') && !popup.matches(':hover'))
						popup.hidePopover();
				}, 120);
			};
			trigger.addEventListener('click', (event) => {
				event.preventDefault();
				show();
			});
			trigger.addEventListener('pointerenter', show);
			trigger.addEventListener('focus', show);
			trigger.addEventListener('pointerleave', hide);
			trigger.addEventListener('blur', hide);
			popup.addEventListener('pointerleave', hide);
			popup.addEventListener('toggle', () => {
				trigger.setAttribute('aria-expanded', String(popup.matches(':popover-open')));
				if (popup.matches(':popover-open')) position();
			});
		}
		const button = document.querySelector('.website-wide-toggle');
		reflectWidth();
		if (button && !initialized.has(button))
			button.addEventListener('click', () => {
				wide = !wide;
				preference = wide;
				try {
					localStorage.setItem('asam-website-wide', String(wide));
				} catch {
					/* Keep the current page usable. */
				}
				reflectWidth();
			});
		if (button) initialized.add(button);
		for (const search of document.querySelectorAll('input[data-component-search]')) {
			if (initialized.has(search)) continue;
			const scope = search.closest('.cd-catalog, aside, main, .mobile-sidebar-content');
			if (!scope) continue;
			const groups = [...scope.querySelectorAll('nav details')];
			if (!groups.length) continue;
			initialized.add(search);
			const state = new Map(groups.map((group) => [group, group.open]));
			search.addEventListener('input', () => {
				const query = search.value.toLowerCase().trim();
				for (const group of groups) {
					for (const link of group.querySelectorAll('a'))
						link.hidden = !`${link.textContent} ${link.getAttribute('href') || ''}`
							.toLowerCase()
							.includes(query);
					const visible = group.querySelectorAll('a:not([hidden])').length;
					const count = group.querySelector('[data-catalog-count]');
					if (count) count.textContent = String(visible);
					group.hidden = visible === 0;
					group.open = query
						? !group.hidden
						: state.get(group) ||
							Boolean(group.querySelector('a[aria-current="page"]'));
				}
			});
		}
	};
	document.addEventListener('DOMContentLoaded', initialize);
	document.addEventListener('asam:page-enter', initialize);
})();
