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
			if (code.textContent.includes('/downloads/asam-ui-usage.tgz'))
				code.textContent = rewrite(code.textContent);
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
})();
