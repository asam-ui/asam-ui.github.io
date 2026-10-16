(() => {
	const root = document.documentElement;
	let replay = document.querySelector('.motion-replay');
	const dismissBoot = () => {
		clearTimeout(window.__asamHomeBootTimeout);
		delete root.dataset.homeBoot;
	};
	if (!window.gsap || !window.ScrollTrigger) {
		dismissBoot();
		if (replay) replay.hidden = true;
		document.body.dataset.homeMotionReady = 'fallback';
		return;
	}
	const { gsap, ScrollTrigger } = window;
	gsap.registerPlugin(ScrollTrigger);
	let media;
	let entered = false;
	function mount(restored = false) {
		if (document.body.dataset.homeMotion !== 'enhanced') return;
		if (media) return;
		replay = document.querySelector('.motion-replay');
		media = gsap.matchMedia();
		media.add(
			{
				all: 'all',
				motion: '(prefers-reduced-motion: no-preference)',
				fine: '(hover: hover) and (pointer: fine)',
				wide: '(min-width: 768px)'
			},
			(context) => {
				const { motion, fine, wide } = context.conditions;
				if (replay) replay.hidden = !motion;
				if (!motion) {
					dismissBoot();
					document.body.dataset.homeMotionReady = 'reduced';
					return;
				}
				const events = new AbortController();
				const on = (target, type, handler, options = {}) =>
					target?.addEventListener(type, handler, { ...options, signal: events.signal });
				let intro;
				const hero = document.querySelector('.hero-art');
				const image = document.querySelector('.hero-image-motion');
				const endIntro = () => {
					intro?.progress(1);
					dismissBoot();
				};
				context.add('playIntro', (withBoot = true) => {
					intro?.progress(1).kill();
					clearTimeout(window.__asamHomeBootTimeout);
					if (withBoot) {
						root.dataset.homeBoot = 'pending';
						window.__asamHomeBootTimeout = setTimeout(endIntro, 2200);
					}
					intro = gsap.timeline({
						defaults: { ease: 'power3.out' },
						onComplete: () => {
							dismissBoot();
							document.body.dataset.homeIntro = 'complete';
						}
					});
					document.body.dataset.homeIntro = 'playing';
					if (withBoot) {
						gsap.set('.boot-panel, .boot-content, .boot-tiles i, .boot-rule', {
							clearProps: 'transform,opacity'
						});
						intro
							.from('.boot-tiles i', {
								x: (index) => [-62, 0, 62][index],
								y: (index) => [34, -48, 34][index],
								rotation: (index) => [-35, 45, 35][index],
								scale: 0.25,
								opacity: 0,
								duration: 0.6,
								stagger: 0.07,
								ease: 'back.out(1.8)'
							})
							.from('.boot-rule', { scaleX: 0, duration: 0.65 }, 0.1)
							.to('.boot-content', { y: -30, opacity: 0, duration: 0.3 }, 0.65)
							.to(
								'.boot-panel',
								{
									yPercent: -105,
									duration: 0.65,
									stagger: 0.07,
									ease: 'power4.inOut'
								},
								0.72
							)
							.call(dismissBoot, [], 1.44);
					}
					const start = withBoot ? 0.9 : 0;
					intro
						.fromTo(
							'.hero-line-inner',
							{ yPercent: 112, rotation: 3, opacity: 0 },
							{
								yPercent: 0,
								rotation: 0,
								opacity: 1,
								duration: 0.85,
								stagger: 0.13,
								clearProps: 'transform,opacity'
							},
							start
						)
						.fromTo(
							'.hero-copy .eyebrow, .hero-copy > p, .hero-actions, .motion-replay',
							{ y: 26, opacity: 0 },
							{
								y: 0,
								opacity: 1,
								duration: 0.7,
								stagger: 0.1,
								clearProps: 'transform,opacity'
							},
							start + 0.08
						)
						.fromTo(
							hero,
							{ y: wide ? 65 : 28, rotation: -7, scale: 0.8, opacity: 0 },
							{
								y: 0,
								rotation: 0,
								scale: 1,
								opacity: 1,
								duration: 1.15,
								ease: 'back.out(1.25)',
								clearProps: 'transform,opacity'
							},
							start
						)
						.fromTo(
							'.stack-strip > *',
							{ y: 24, opacity: 0 },
							{
								y: 0,
								opacity: 1,
								duration: 0.7,
								stagger: 0.1,
								clearProps: 'transform,opacity'
							},
							start + 0.4
						);
				});
				if (!entered && !restored && scrollY < 80 && root.dataset.homeBoot === 'pending') {
					context.playIntro(true);
				} else dismissBoot();
				entered = true;
				on(replay, 'click', () => {
					window.scrollTo({ top: 0, behavior: 'instant' });
					context.playIntro(true);
				});
				on(document, 'keydown', (event) => {
					if (event.key === 'Tab' || event.key === 'Escape') endIntro();
				});
				on(window, 'wheel', endIntro, { passive: true });
				on(window, 'touchmove', endIntro, { passive: true });
				// Finish after click dispatch; moving a pressed link on pointerdown
				// can move it away before pointerup and swallow its navigation.
				on(document, 'click', (event) => {
					if (!event.target.closest('.motion-replay')) endIntro();
				});

				// Scroll owns the fixed card shell; pointer tilt owns the inner surface.
				for (const element of document.querySelectorAll('[data-reveal]')) {
					const card = element.matches('[data-tilt-card]');
					const index = card ? [...element.parentElement.children].indexOf(element) : 0;
					const reveal = gsap.from(element, {
						y: card ? 72 : 44,
						rotationX: card && wide ? 9 : 0,
						scale: card ? 0.94 : 1,
						opacity: 0,
						duration: 0.9,
						delay: wide ? index * 0.13 : 0,
						ease: 'power3.out',
						clearProps: 'transform,opacity',
						scrollTrigger: { trigger: element, start: 'top 94%', once: true }
					});
					// Opacity never removes links from tab order. Focus reveals them immediately.
					on(element, 'focusin', () => reveal.progress(1));
				}
				gsap.fromTo(
					'.motion-progress',
					{ scaleX: 0 },
					{
						scaleX: 1,
						ease: 'none',
						scrollTrigger: { start: 0, end: 'max', scrub: 0.2 }
					}
				);
				if (wide) {
					for (const [selector, y] of [
						['.tilt-token-small', 55],
						['.tilt-token-radius', 85]
					]) {
						gsap.from(selector, {
							y,
							ease: 'none',
							scrollTrigger: {
								trigger: '.token-composition',
								start: 'top 95%',
								end: 'center 58%',
								scrub: 0.6
							}
						});
					}
				}
				const float = hero.querySelector('.hero-scene')
					? null
					: gsap.to(image, {
							y: wide ? -12 : -6,
							rotation: 1.4,
							duration: 3.2,
							ease: 'sine.inOut',
							repeat: -1,
							yoyo: true
						});
				const orbit = hero.querySelector('.hero-orbit')
					? gsap.to('.hero-orbit', {
							rotation: '+=360',
							duration: 36,
							repeat: -1,
							ease: 'none'
						})
					: null;
				let heroVisible = true;
				const ambient = () => {
					const playing = heroVisible && !document.hidden;
					float?.paused(!playing);
					orbit?.paused(!playing);
				};
				const heroVisibility = ScrollTrigger.create({
					trigger: '.hero',
					start: 'top bottom',
					end: 'bottom top',
					onToggle: (trigger) => {
						heroVisible = trigger.isActive;
						ambient();
					}
				});
				heroVisible = heroVisibility.isActive;
				on(document, 'visibilitychange', () => {
					if (document.hidden) endIntro();
					ambient();
				});
				if (fine && wide && !hero.querySelector('.hero-scene')) {
					const moveX = gsap.quickTo(image, 'rotationY', {
						duration: 0.8,
						ease: 'power3.out'
					});
					const moveY = gsap.quickTo(image, 'rotationX', {
						duration: 0.8,
						ease: 'power3.out'
					});
					on(hero, 'pointermove', (event) => {
						if (event.pointerType === 'touch') return;
						const rect = hero.getBoundingClientRect();
						moveX(((event.clientX - rect.left) / rect.width - 0.5) * 12);
						moveY(-((event.clientY - rect.top) / rect.height - 0.5) * 8);
					});
					const reset = () => {
						moveX(0);
						moveY(0);
					};
					on(hero, 'pointerleave', reset);
					on(hero, 'pointercancel', reset);
					on(window, 'blur', reset);
				}
				document.body.dataset.homeMotionReady = 'true';
				ambient();
				return () => {
					events.abort();
					intro?.kill();
					dismissBoot();
					document.body.dataset.homeIntro = 'complete';
				};
			}
		);
	}
	mount();
	const cleanup = () => {
		media?.revert();
		media = null;
		dismissBoot();
	};
	window.addEventListener('pagehide', cleanup);
	document.addEventListener('asam:page-leave', cleanup);
	document.addEventListener('asam:page-enter', () => mount(true));
	window.addEventListener('pageshow', (event) => {
		if (event.persisted) mount(true);
	});
})();
