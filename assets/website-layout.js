(() => {
	let wide = false;
	try {
		wide = localStorage.getItem('asam-website-wide') === 'true';
	} catch {
		/* Storage can be unavailable. */
	}
	document.documentElement.dataset.wide = String(wide);
	const initialized = new WeakSet();
	const initialize = () => {
		const button = document.querySelector('.website-wide-toggle');
		const reflect = () => {
			button?.setAttribute('aria-pressed', String(wide));
			button?.setAttribute('aria-label', wide ? '退出宽屏模式' : '开启宽屏模式');
			button?.setAttribute('title', wide ? '退出宽屏模式' : '开启宽屏模式');
		};
		reflect();
		if (button && !initialized.has(button))
			button.addEventListener('click', () => {
				wide = !wide;
				document.documentElement.dataset.wide = String(wide);
				try {
					localStorage.setItem('asam-website-wide', String(wide));
				} catch {
					/* Keep the current page usable. */
				}
				reflect();
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
