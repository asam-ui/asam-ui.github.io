(() => {
	const redirect = () => {
		if (location.pathname !== '/pro/public-api.html') return;
		const hash = location.hash;
		const target = hash.startsWith('#type-')
			? hash.replace('#type-', '#type-pro-')
			: hash || '#package-pro';
		location.replace('/type-dictionary.html' + location.search + target);
	};
	document.addEventListener('asam:page-enter', redirect);
	redirect();
})();
