(() => {
	if (document.body.dataset.page !== 'home') return;
	let cleanup;
	function mount() {
		if (cleanup) return;
		const events = new AbortController();
		const reduce = matchMedia('(prefers-reduced-motion: reduce)');
		const fine = matchMedia('(hover: hover) and (pointer: fine)');
		const on = (target, name, handler, options = {}) =>
			target.addEventListener(name, handler, { ...options, signal: events.signal });
		const cards = [...document.querySelectorAll('[data-tilt-card]')].map((element) => ({
			element,
			surface: element.querySelector('[data-tilt-surface]'),
			strength: Number(element.dataset.tiltStrength || 8),
			x: 0,
			y: 0,
			velocityX: 0,
			velocityY: 0,
			targetX: 0,
			targetY: 0,
			active: false
		}));
		let frame = 0;
		let previousTime = 0;
		const enabled = () => !reduce.matches && fine.matches;
		function paint(card) {
			card.surface.style.setProperty('--tilt-x', `${card.x.toFixed(3)}deg`);
			card.surface.style.setProperty('--tilt-y', `${card.y.toFixed(3)}deg`);
			card.surface.style.setProperty('--tilt-shadow-x', `${(-card.y * 2).toFixed(2)}px`);
			card.surface.style.setProperty(
				'--tilt-shadow-y',
				`${(14 + card.x * 1.4).toFixed(2)}px`
			);
		}
		function tick(time) {
			frame = 0;
			const dt = Math.min((time - previousTime) / 1000 || 1 / 60, 1 / 30);
			previousTime = time;
			let unsettled = false;
			for (const card of cards) {
				const distance = Math.abs(card.targetX - card.x) + Math.abs(card.targetY - card.y);
				const speed = Math.abs(card.velocityX) + Math.abs(card.velocityY);
				if (distance < 0.005 && speed < 0.025) {
					card.x = card.targetX;
					card.y = card.targetY;
					card.velocityX = card.velocityY = 0;
					card.element.removeAttribute('data-tilt-moving');
				} else {
					card.velocityX += ((card.targetX - card.x) * 245 - card.velocityX * 22) * dt;
					card.velocityY += ((card.targetY - card.y) * 245 - card.velocityY * 22) * dt;
					card.x = Math.max(
						-card.strength,
						Math.min(card.strength, card.x + card.velocityX * dt)
					);
					card.y = Math.max(
						-card.strength,
						Math.min(card.strength, card.y + card.velocityY * dt)
					);
					card.element.dataset.tiltMoving = 'true';
					unsettled = true;
				}
				paint(card);
			}
			if (unsettled) frame = requestAnimationFrame(tick);
		}
		function schedule() {
			if (!frame) {
				previousTime = performance.now();
				frame = requestAnimationFrame(tick);
			}
		}
		function reset(card, instant = false) {
			card.targetX = card.targetY = 0;
			card.active = false;
			card.element.removeAttribute('data-tilt-active');
			if (instant) {
				card.x = card.y = card.velocityX = card.velocityY = 0;
				card.element.removeAttribute('data-tilt-moving');
				paint(card);
			} else schedule();
		}
		function resetAll(instant = false) {
			if (instant && frame) {
				cancelAnimationFrame(frame);
				frame = 0;
			}
			cards.forEach((card) => reset(card, instant));
		}
		for (const card of cards) {
			const move = (event) => {
				if (!enabled() || event.pointerType === 'touch') return;
				// Measure the fixed grid item, never the transformed surface. This
				// keeps a stationary pointer from feeding its own tilt back into itself.
				const rect = card.element.getBoundingClientRect();
				const nx = Math.max(
					-1,
					Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1)
				);
				const ny = Math.max(
					-1,
					Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1)
				);
				// Positive CSS z points at the viewer: these signs press the
				// pointed corner away from the viewer instead of lifting it.
				card.targetX = -ny * card.strength;
				card.targetY = nx * card.strength;
				card.active = true;
				card.element.dataset.tiltActive = 'true';
				card.surface.style.setProperty('--glare-x', `${((nx + 1) * 50).toFixed(1)}%`);
				card.surface.style.setProperty('--glare-y', `${((ny + 1) * 50).toFixed(1)}%`);
				schedule();
			};
			on(card.element, 'pointerenter', move);
			on(card.element, 'pointermove', move);
			on(card.element, 'pointerleave', () => reset(card));
			on(card.element, 'pointercancel', () => reset(card, true));
			on(card.element, 'focusin', () => reset(card, true));
		}
		on(reduce, 'change', () => resetAll(true));
		on(fine, 'change', () => resetAll(true));
		on(window, 'resize', () => resetAll(true), { passive: true });
		on(window, 'scroll', () => resetAll(true), { passive: true });
		on(window, 'blur', () => resetAll(true));
		on(document, 'visibilitychange', () => {
			if (document.hidden) resetAll(true);
		});
		document.body.dataset.homeInteractiveReady = 'true';
		cleanup = () => {
			resetAll(true);
			events.abort();
			cleanup = null;
		};
	}
	mount();
	window.addEventListener('pagehide', () => cleanup?.());
	window.addEventListener('pageshow', (event) => {
		if (event.persisted) mount();
	});
})();
