(() => {
	const bound = new WeakSet();
	function initialize() {
		for (const image of document.querySelectorAll(
			'.pro-template-picture img, .ph-template-image img'
		)) {
			if (bound.has(image)) continue;
			bound.add(image);
			const fallback = () => {
				image.hidden = true;
				const label = image.nextElementSibling;
				if (label) label.hidden = false;
			};
			image.addEventListener('error', fallback);
			if (image.complete && !image.naturalWidth) fallback();
		}
		for (const button of document.querySelectorAll('[data-pro-copy]')) {
			if (bound.has(button)) continue;
			bound.add(button);
			button.addEventListener('click', async () => {
				const status =
					button.closest('details')?.querySelector('[role="status"]') ??
					button.nextElementSibling;
				try {
					await navigator.clipboard.writeText(
						JSON.parse(document.getElementById(button.dataset.proCopy).textContent)
					);
					status.textContent = '已复制完整文件';
				} catch {
					status.textContent = '复制未完成，请选择下方源码手动复制';
				}
			});
		}
	}
	initialize();
	document.addEventListener('asam:page-enter', initialize);
})();
