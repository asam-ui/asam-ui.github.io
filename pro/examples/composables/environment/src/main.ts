import { createApp } from 'vue';
import type { App, Component } from 'vue';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
import '@asam-ui/pro/style.css';
import * as entry from './inline-entry';
const demo: {
	default: Component;
	scoped?: boolean;
	configure?: (app: App) => void | (() => void) | Promise<void | (() => void)>;
} = entry;
const app = createApp(
	demo.default,
	demo.scoped ? { scopeId: 'composable/environment:demo-composable-environment' } : undefined
);
const cleanup = await demo.configure?.(app);
if (typeof cleanup === 'function') app.onUnmount(cleanup);
app.mount('#app');
window.addEventListener('pagehide', () => app.unmount(), { once: true });
