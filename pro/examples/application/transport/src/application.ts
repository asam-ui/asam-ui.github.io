import { createApp, h } from 'vue';
import type { AsamI18n } from '@asam-ui/ui/i18n';
import { AsamConfigProvider, provideAsamData } from '@asam-ui/ui';
import '@asam-ui/ui/style.css';
import 'element-plus/dist/index.css';
import { createRequestClient } from '@asam-ui/pro/application/transport';
import { createTransportProvider } from '@asam-ui/pro/application/transport';
import type { SafeError } from '@asam-ui/pro/application/transport';
import { createMockTransport, unwrapMock } from './mock.js';
import TransportDemo from './TransportDemo.vue';
import { demoContextKey } from './context.js';

export function mountDemo(
	element: Element,
	options: { i18n?: AsamI18n } = {},
	onError?: (error: unknown) => void
) {
	const mock = createMockTransport();
	let authVersion = 1;
	const listeners = new Set<(error: SafeError) => void>();
	const client = createRequestClient({
		i18n: options.i18n,
		transport: mock.transport,
		auth: () => ({ Authorization: `Bearer local-mock-${authVersion}` }),
		present: (error) => {
			for (const listener of listeners) listener(error);
		}
	});
	const app = createApp({
		render: () => h(AsamConfigProvider, { i18n: options.i18n }, () => h(TransportDemo))
	});
	app.provide(demoContextKey, {
		i18n: options.i18n,
		setScenario: mock.setScenario,
		updateAuth() {
			authVersion++;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
	});
	provideAsamData(app, createTransportProvider(client, unwrapMock));
	((app.config.errorHandler = onError), app.mount(element));
	return () => {
		app.unmount();
		client.dispose();
		listeners.clear();
	};
}
