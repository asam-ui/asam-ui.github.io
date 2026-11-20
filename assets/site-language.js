(() => {
	const preferenceKey = 'asam-website-language';
	const fragmentKey = 'asam-website-language-fragment';
	try {
		const target = sessionStorage.getItem(fragmentKey);
		if (target) sessionStorage.removeItem(fragmentKey);
		if (target === location.href && location.hash) {
			const id = decodeURIComponent(location.hash.slice(1));
			// A translated heading may have no counterpart in the other language.
			if (!document.getElementById(id))
				history.replaceState(history.state, '', location.pathname + location.search);
		}
	} catch {
		// Direct links remain usable without browser storage.
	}
	if (location.pathname === '/') {
		try {
			if (localStorage.getItem(preferenceKey) === 'en') {
				location.replace('/en/index.html' + location.search + location.hash);
				return;
			}
		} catch {
			// Explicit links also work without local storage.
		}
	}

	function reflectLanguageLink() {
		const link = document.querySelector('[data-site-language-toggle]');
		if (!link) return;
		const url = new URL(link.dataset.siteLanguageRoute, location.origin);
		if (link.dataset.siteLanguageMatch === 'true') {
			url.search = location.search;
			url.hash = location.hash;
		}
		link.href = url.href;
	}

	document.addEventListener('asam:page-commit', reflectLanguageLink);
	document.addEventListener('asam:page-enter', reflectLanguageLink);
	document.addEventListener('asam:document-controls-ready', reflectLanguageLink);
	window.addEventListener('hashchange', reflectLanguageLink);
	window.addEventListener('pageshow', reflectLanguageLink);
	document.addEventListener('click', (event) => {
		if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
			return;
		const switcher =
			event.target instanceof Element
				? event.target.closest('[data-site-language-toggle]')
				: null;
		if (!switcher) return;
		try {
			localStorage.setItem(preferenceKey, switcher.hreflang);
			if (location.hash && switcher.dataset.siteLanguageMatch === 'true')
				sessionStorage.setItem(fragmentKey, switcher.href);
		} catch {
			// The selected URL remains stable after a refresh.
		}
	});
	reflectLanguageLink();
})();
