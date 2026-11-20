import { createApp as createOwnerApp } from 'vue';
import { AsamI18nKey } from '@asam-ui/ui/i18n';
import type { AsamI18n } from '@asam-ui/ui/i18n';
import { createApp, defineComponent, h } from 'vue';
import { createRouter, createMemoryHistory as createWebHistory } from 'vue-router';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
import '@asam-ui/pro/style.css';
import App from './App.vue';
import { useExampleText } from './Texts.js';
export async function mountWebsiteExample(
	element: Element,
	onError: (error: unknown) => void,
	i18n?: AsamI18n
) {
	const apps: ReturnType<typeof createOwnerApp>[] = [];
	const createApp: typeof createOwnerApp = (...args) => {
		const app = createOwnerApp(...args);
		if (i18n) app.provide(AsamI18nKey, i18n);
		app.config.errorHandler = onError;
		apps.push(app);
		return app;
	};

	const router = createRouter({
		history: createWebHistory(),
		routes: [
			{
				path: '/safe',
				component: defineComponent(() => {
					const text = useExampleText();
					return () => h('p', text.t('safe'));
				})
			},
			{ path: '/redirect', redirect: '/home' },
			{
				path: '/:pathMatch(.*)*',
				component: defineComponent(() => {
					const text = useExampleText();
					return () => h('p', text.t('unmatched'));
				})
			}
		]
	});
	const application = createApp(App).use(router);
	await router.isReady();
	const view = application.mount(element);

	return () => {
		for (const app of apps.reverse()) app.unmount();
	};
}
