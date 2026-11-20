import { createApp as createOwnerApp } from 'vue';
import { AsamI18nKey } from '@asam-ui/ui/i18n';
import type { AsamI18n } from '@asam-ui/ui/i18n';
import { createApp } from 'vue';
import { createRouter, createMemoryHistory as createWebHistory } from 'vue-router';
import App from './App.vue';
import BusinessPage from './BusinessPage.vue';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
import '@asam-ui/pro/style.css';
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
			{ path: '/', component: BusinessPage },
			{ path: '/safe', component: BusinessPage },
			{ path: '/:pathMatch(.*)*', component: BusinessPage }
		]
	});
	const app = createApp(App).use(router);
	const view = app.mount(element);

	return () => {
		for (const app of apps.reverse()) app.unmount();
	};
}
