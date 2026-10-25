(() => {
	const initialized = new WeakSet();
	const reveal = (hash) => {
		let target;
		try {
			target = document.getElementById(decodeURIComponent(hash.slice(1)));
		} catch {
			return;
		}
		if (!target?.closest('.type-dictionary-page')) return;
		for (let parent = target; parent; parent = parent.parentElement)
			if (parent instanceof HTMLDetailsElement) parent.open = true;
	};
	const initialize = () => {
		const page = document.querySelector('.type-dictionary-page');
		if (!page || initialized.has(page)) return;
		initialized.add(page);
		const rows = [...page.querySelectorAll('[data-type-row]')];
		const empty = document.createElement('p');
		empty.dataset.typeEmptyResults = '';
		empty.setAttribute('role', 'status');
		empty.textContent = '没有找到匹配的类型，请调整搜索关键词。';
		page.querySelector('[data-type-count]').after(empty);
		const filter = () => {
			const query = page.querySelector('[data-type-search-input]').value.trim().toLowerCase();
			for (const row of rows)
				row.hidden = !row.dataset.typeSearch.toLowerCase().includes(query);
			let visible = 0;
			for (const section of page.querySelectorAll('[data-type-package]')) {
				const count = [...section.querySelectorAll('[data-type-row]')].filter(
					(row) => !row.hidden
				).length;
				section.hidden = count === 0;
				visible += count;
				section.querySelector('[data-type-empty]').hidden = count > 0;
			}
			page.querySelector('[data-type-count]').textContent = visible + ' 个类型';
			empty.hidden = visible > 0;
		};
		page.querySelector('[data-type-search-input]').addEventListener('input', filter);
		page.addEventListener('click', (event) => {
			const link = event.target.closest('[data-type-definition]');
			if (link) reveal(link.hash);
		});
		filter();
		reveal(location.hash);
	};
	document.addEventListener('asam:page-enter', initialize);
	addEventListener('hashchange', () => reveal(location.hash));
	initialize();
})();
