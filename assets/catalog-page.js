(() => {
	'use strict';
	const catalog = document.querySelector('#catalog');
	const input = document.querySelector('#component-search');
	const cards = [...document.querySelectorAll('[data-component]')];
	const groups = [...document.querySelectorAll('[data-catalog-group]')];
	const filters = [...document.querySelectorAll('[data-filter]')];
	const count = document.querySelector('#result-count');
	const empty = document.querySelector('#catalog-empty');
	const reset = document.querySelector('#reset-filters');
	if (!catalog || !input || !cards.length) return;

	let activeGroup = 'all';
	input.value = new URLSearchParams(location.search).get('q') || '';
	function filterCatalog() {
		const query = input.value.trim().toLowerCase();
		let visible = 0;
		for (const card of cards) {
			const match =
				(activeGroup === 'all' || card.dataset.group === activeGroup) &&
				card.dataset.search.includes(query);
			card.hidden = !match;
			if (match) visible++;
		}
		for (const group of groups) {
			group.hidden = !group.querySelector('[data-component]:not([hidden])');
		}
		count.textContent = `${visible} 个组件`;
		empty.hidden = visible > 0;
		for (const button of filters) {
			button.setAttribute('aria-pressed', String(button.dataset.filter === activeGroup));
		}
		window.ScrollTrigger?.refresh();
	}
	input.addEventListener('input', filterCatalog);
	for (const button of filters) {
		button.addEventListener('click', () => {
			activeGroup = button.dataset.filter;
			filterCatalog();
		});
	}
	for (const link of document.querySelectorAll('[data-group-link]')) {
		link.addEventListener('click', () => {
			activeGroup = 'all';
			input.value = '';
			filterCatalog();
		});
	}
	reset.addEventListener('click', () => {
		activeGroup = 'all';
		input.value = '';
		filterCatalog();
		input.focus();
	});
	filterCatalog();
})();
