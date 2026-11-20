import { createApp } from 'vue';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
import '@asam-ui/pro/style.css';
import App from './App.vue';

const app = createApp(App);
app.mount('#app');
window.addEventListener('pagehide', () => app.unmount(), { once: true });
