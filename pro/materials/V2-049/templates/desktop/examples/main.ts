import { createApp, defineComponent, h } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
import '@asam-ui/pro/style.css';
import App from './App.vue';
import { AsamApplicationProvider } from '@asam-ui/pro';
import MinimalDesktop from '../MinimalDesktop.vue';
import ExamplePanel from './ExamplePanel.vue';
import { createDesktop } from '../Desktop.js';
import { browserStorage } from '../../app/preferences/Storage.js';
import { panels, desktopConfig } from './config.js';
import type { Scope } from '../../app/preferences/Types.js';
const placeholder = defineComponent(() => () => h('div'));
const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', component: placeholder },
		{ path: '/guide', component: placeholder }
	]
});
const application = createApp(App).use(router);
await router.isReady();
application.mount('#app');
if (new URLSearchParams(location.search).has('test'))
	Object.assign(window, {
		desktopApplication: application,
		createDesktopPeer(owner: Scope) {
			const container = document.createElement('div');
			container.dataset.peer = 'true';
			document.body.append(container);
			const controller = createDesktop({
				app: desktopConfig.app,
				owner,
				scope: desktopConfig.scope,
				panels,
				storage: browserStorage()
			});
			const peer = createApp({
				render: () =>
					h(
						AsamApplicationProvider,
						{},
						{
							default: () =>
								h(
									MinimalDesktop,
									{ controller, title: '独立工作台' },
									{
										panel: (scope: {
											panel: { id: string };
											readonly: boolean;
										}) =>
											h(ExamplePanel, {
												id: scope.panel.id,
												readonly: scope.readonly,
												disabled: false
											})
									}
								)
						}
					)
			});
			peer.mount(container);
			return {
				controller,
				destroy() {
					peer.unmount();
					controller.dispose();
					container.remove();
				}
			};
		}
	});
