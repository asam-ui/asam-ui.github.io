(() => {
	const origins = { cn: 'https://asam-ui.cn', international: 'https://asam-ui.github.io' };
	const region = ['asam-ui.cn', 'www.asam-ui.cn'].includes(location.hostname)
		? 'cn'
		: 'international';
	const origin = origins[region];
	const rewrite = (value) =>
		value
			.replaceAll('https://asam-ui.github.io/downloads/', origin + '/downloads/')
			.replaceAll('https://asam-ui.cn/downloads/', origin + '/downloads/');
	function rewriteCode(node) {
		// Preserve syntax tokens and their theme colors when updating download origins.
		if (node.nodeType === 3) node.data = rewrite(node.data);
		else for (const child of node.childNodes) rewriteCode(child);
	}
	function reflect() {
		for (const link of document.querySelectorAll('[data-site-region]')) {
			link.href =
				origins[link.dataset.siteRegion] +
				location.pathname +
				location.search +
				location.hash;
			if (link.dataset.siteRegion === region) link.setAttribute('aria-current', 'true');
			else link.removeAttribute('aria-current');
		}
		for (const code of document.querySelectorAll('code'))
			if (code.textContent.includes('/downloads/asam-ui-usage.tgz')) rewriteCode(code);
		for (const link of document.querySelectorAll('a[href*="/downloads/"]'))
			link.href = rewrite(link.href);
		for (const node of document.querySelectorAll('[data-copy-value]'))
			node.dataset.copyValue = rewrite(node.dataset.copyValue);
		const canonical = document.querySelector('link[rel="canonical"]');
		if (canonical) canonical.href = origin + location.pathname;
		const og = document.querySelector('meta[property="og:url"]');
		if (og) og.content = origin + location.pathname;
	}
	document.addEventListener('DOMContentLoaded', reflect);
	document.addEventListener('asam:page-enter', reflect);
	window.addEventListener('hashchange', reflect);
	window.addEventListener('popstate', reflect);
	const menu = () => document.querySelector('#site-region-options');
	const toggle = () => document.querySelector('[data-site-region-toggle]');
	function close(returnFocus = false) {
		if (!menu()) return;
		menu().hidden = true;
		toggle().setAttribute('aria-expanded', 'false');
		if (returnFocus) toggle().focus();
	}
	function open(last = false) {
		menu().hidden = false;
		toggle().setAttribute('aria-expanded', 'true');
		const links = menu().querySelectorAll('a');
		links[last ? links.length - 1 : 0].focus();
	}
	document.addEventListener('click', (event) => {
		if (event.target.closest('[data-site-region-toggle]')) {
			if (menu().hidden) open();
			else close();
		} else if (
			!event.target.closest('.site-region-switch') ||
			event.target.closest('[data-site-region]')
		)
			close();
	});
	document.addEventListener('keydown', (event) => {
		if (
			event.target.closest('[data-site-region-toggle]') &&
			['ArrowDown', 'ArrowUp'].includes(event.key)
		) {
			event.preventDefault();
			open(event.key === 'ArrowUp');
		} else if (menu() && !menu().hidden) {
			if (event.key === 'Escape') {
				event.preventDefault();
				close(true);
			} else if (
				event.target.closest('#site-region-options') &&
				['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
			) {
				event.preventDefault();
				const links = [...menu().querySelectorAll('a')];
				const index = links.indexOf(event.target);
				links[
					event.key === 'Home'
						? 0
						: event.key === 'End'
							? links.length - 1
							: (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) %
								links.length
				].focus();
			}
		}
	});
	document.addEventListener('focusin', (event) => {
		if (!event.target.closest('.site-region-switch')) close();
	});
})();
