export async function copyText(text) {
	if (window.isSecureContext && navigator.clipboard) return navigator.clipboard.writeText(text);
	const selection = window.getSelection();
	if (!selection) throw Error('Clipboard unavailable');
	const ranges = Array.from({ length: selection.rangeCount }, (_, index) =>
		selection.getRangeAt(index).cloneRange()
	);
	const content = document.createElement('span');
	content.textContent = text;
	content.style.cssText =
		'position:fixed;top:0;left:0;opacity:0;pointer-events:none;white-space:pre';
	const focused = document.activeElement;
	(document.querySelector('dialog[open]') || document.body).append(content);
	try {
		const range = document.createRange();
		range.selectNodeContents(content);
		selection.removeAllRanges();
		selection.addRange(range);
		if (!document.execCommand('copy')) throw Error('Clipboard unavailable');
	} finally {
		content.remove();
		selection.removeAllRanges();
		for (const range of ranges) selection.addRange(range);
		focused?.focus({ preventScroll: true });
	}
}
