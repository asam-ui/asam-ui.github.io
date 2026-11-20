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
			button.setAttribute('aria-pressed', String(wide));
			button.setAttribute('aria-label', wide ? '退出宽屏模式' : '开启宽屏模式');
			button.setAttribute('title', wide ? '退出宽屏模式' : '开启宽屏模式');
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
		if (!target?.closest('.cd-api-appendix')) return;
		for (let parent = target.parentElement; parent; parent = parent.parentElement)
			if (parent instanceof HTMLDetailsElement) parent.open = true;
		target.scrollIntoView();
	};
	document.addEventListener('click', (event) => {
		const link = event.target.closest('a[href^="#api-note-"]');
		if (link) requestAnimationFrame(revealNote);
	});
	window.addEventListener('hashchange', revealNote);
	const initialize = () => {
		revealNote();
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
		for (const search of document.querySelectorAll('[data-component-search]')) {
			if (initialized.has(search)) continue;
			initialized.add(search);
			const groups = [
				...search
					.closest('aside, main, .mobile-sidebar-content')
					.querySelectorAll('nav details')
			];
			const state = new Map(groups.map((group) => [group, group.open]));
			search.addEventListener('input', () => {
				const query = search.value.toLowerCase().trim();
				for (const group of groups) {
					for (const link of group.querySelectorAll('a'))
						link.hidden = !`${link.textContent} ${link.getAttribute('href') || ''}`
							.toLowerCase()
							.includes(query);
					group.hidden = !group.querySelector('a:not([hidden])');
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
