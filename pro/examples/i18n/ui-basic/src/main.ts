import { createApp } from 'vue';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
import App from './App.vue';
const app = createApp(App);
app.mount('#app');
document.body.dataset.i18nReady = 'true';
window.addEventListener('pagehide', () => app.unmount(), { once: true });
