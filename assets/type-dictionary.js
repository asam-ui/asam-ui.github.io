(() => {
	const initialized = new WeakSet();
	const groupOf = (target) =>
		target?.closest('[data-type-group]')?.dataset.typeGroup ||
		target?.closest('[data-document-tab-content]')?.dataset.documentTabContent;
	const hashTarget = (hash) => {
		try {
			return document.getElementById(decodeURIComponent(hash.slice(1)));
		} catch {
			return null;
		}
	};
	const selectGroup = (page, name) => {
		page.dataset.typeGroup = name;
		page.querySelector('.type-dictionary-tabs')
			?.closest('[data-asam-document-control]')
			?.dispatchEvent(new CustomEvent('asam:document-tab-select', { detail: { name } }));
	};
	const reveal = (hash) => {
		const target = hashTarget(hash);
		const page = target?.closest('.type-dictionary-page');
		if (!page) return;
		const group = groupOf(target);
		if (target.closest('[data-type-package]')?.hidden) {
			const input = page.querySelector(
				'input[data-type-search-input], [data-type-search-input] input'
			);
			input.value = '';
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}
		if (group) selectGroup(page, group);
		for (let parent = target; parent; parent = parent.parentElement)
			if (parent instanceof HTMLDetailsElement) parent.open = true;
	};
	const initialize = () => {
		const page = document.querySelector('.type-dictionary-page');
		if (!page || initialized.has(page)) return;
		initialized.add(page);
		const english = document.documentElement.lang.startsWith('en');
		page.dataset.typeGroup = 'ui';
		const input = page.querySelector(
			'input[data-type-search-input], [data-type-search-input] input'
		);
		const empty = document.createElement('p');
		empty.dataset.typeEmptyResults = '';
		empty.setAttribute('role', 'status');
		empty.textContent = english
			? 'No matching types. Try another search term.'
			: '没有找到匹配的类型，请调整搜索关键词。';
		page.querySelector('[data-type-count]').after(empty);
		const filter = () => {
			const query = input.value.trim().toLowerCase();
			for (const row of page.querySelectorAll('[data-type-row]'))
				row.hidden = !row.dataset.typeSearch.toLowerCase().includes(query);
			let visible = 0;
			for (const section of page.querySelectorAll('[data-type-package]')) {
				const count = [...section.querySelectorAll('[data-type-row]')].filter(
					(row) => !row.hidden
				).length;
				section.hidden = count === 0;
				if (section.dataset.typeGroup === page.dataset.typeGroup) visible += count;
				section.querySelector('[data-type-empty]').hidden = count > 0;
			}
			page.querySelector('[data-type-count]').textContent =
				visible + (english ? (visible === 1 ? ' type' : ' types') : ' 个类型');
			empty.hidden = visible > 0;
		};
		input.addEventListener('input', filter);
		page.addEventListener('asam:document-tab-change', (event) => {
			page.dataset.typeGroup = event.detail.name;
			filter();
			const target = hashTarget(location.hash);
			if (groupOf(target) !== event.detail.name)
				history.replaceState(history.state, '', '#package-' + event.detail.name);
		});
		page.addEventListener('click', (event) => {
			const link = event.target.closest('[data-type-definition]');
			if (link) reveal(link.hash);
		});
		filter();
		reveal(location.hash);
	};
	document.addEventListener('asam:page-enter', initialize);
	document.addEventListener('asam:document-controls-ready', () => reveal(location.hash));
	addEventListener('hashchange', () => reveal(location.hash));
	initialize();
})();
