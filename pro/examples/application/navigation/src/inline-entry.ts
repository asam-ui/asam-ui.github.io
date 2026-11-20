export { default } from './MinimalExample.vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h } from 'vue';
import type { App } from 'vue';
export async function configure(app: App) {
	const Safe = defineComponent({ render: () => h('p', '本卡片的安全返回页') });
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: Safe },
			{ path: '/safe', component: Safe }
		]
	});
	app.use(router);
	await router.replace('/safe');
	await router.isReady();
	return () => router.options.history.destroy();
}
