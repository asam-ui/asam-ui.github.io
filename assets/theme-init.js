(() => {
	let preference;
	try {
		preference = localStorage.getItem('asam-prototype-theme');
	} catch {
		/* Storage is optional in file previews. */
	}
	const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const concept = document.documentElement.dataset.conceptHome;
	if (concept === 'b' || concept === 'c') {
		document.documentElement.dataset.theme = concept === 'c' ? 'dark' : 'light';
		return;
	}
	const context = new URLSearchParams(location.search).get('concept');
	document.documentElement.dataset.theme =
		preference === 'dark' ||
		(preference !== 'light' && (context === 'c' || (context !== 'b' && systemDark)))
			? 'dark'
			: 'light';
})();
