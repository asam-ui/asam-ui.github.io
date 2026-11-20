import { createApp, defineComponent, h } from 'vue';
import { createRouter, createMemoryHistory as createWebHistory } from 'vue-router';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
import '@asam-ui/pro/style.css';
import App from './App.vue';
import { useExampleText } from './Texts.js';
const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/safe',
			component: defineComponent(() => {
				const text = useExampleText();
				return () => h('p', text.t('safeTitle'));
			})
		},
		{
			path: '/:pathMatch(.*)*',
			component: defineComponent(() => {
				const text = useExampleText();
				return () => h('p', text.t('choose'));
			})
		}
	]
});
const application = createApp(App).use(router);
await router.isReady();
application.mount('#app');
