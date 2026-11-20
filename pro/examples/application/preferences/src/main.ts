import { createApp } from 'vue';
import { createRouter, createMemoryHistory as createWebHistory } from 'vue-router';
import App from './App.vue';
import BusinessPage from './BusinessPage.vue';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
import '@asam-ui/pro/style.css';
const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', component: BusinessPage },
		{ path: '/safe', component: BusinessPage },
		{ path: '/:pathMatch(.*)*', component: BusinessPage }
	]
});
export const app = createApp(App).use(router);
export const view = app.mount('#app');
