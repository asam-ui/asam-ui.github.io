<template>
	<AsamApplicationProvider
		:config="{ size, colorMode: preferences.colorMode.value }"
		class="desktop-demo"
		:data-mode="preferences.colorMode.value"
	>
		<div class="desktop-demo-controls" aria-label="模板预览设置">
			<label
				>风格
				<select v-model="family" aria-label="风格">
					<option value="minimal">克制简约</option>
					<option value="brand">品牌分栏</option>
					<option value="tech">深色科技</option>
				</select></label
			>
			<label
				>尺寸
				<select v-model="size" aria-label="尺寸">
					<option value="small">28</option>
					<option value="default">32</option>
					<option value="big">36</option>
					<option value="large">40</option>
				</select></label
			>
			<label
				>主题
				<select :value="preferences.theme.value" aria-label="主题" @change="themeChange">
					<option value="light">亮色</option>
					<option value="dark">暗色</option>
					<option value="system">跟随系统</option>
				</select></label
			>
			<label><input v-model="readOnly" type="checkbox" />只读</label
			><label><input v-model="disabled" type="checkbox" />禁用</label>
			<label><input v-model="permission" type="checkbox" />笔记权限</label>
			<label
				>面板状态
				<select v-model="status" aria-label="面板状态">
					<option value="ready">正常</option>
					<option value="loading">加载</option>
					<option value="empty">空</option>
					<option value="error">错误</option>
				</select></label
			>
			<label
				>身份
				<select v-model="identity" aria-label="身份">
					<option value="number">数字0</option>
					<option value="string">字符串0</option>
					<option value="null">null</option>
				</select></label
			>
			<AsamButton :disabled="!mounted" @click="mounted = false">卸载工作台</AsamButton>
		</div>
		<component
			v-if="mounted"
			:is="pages[family]"
			:controller="desktop"
			:title="desktopConfig.title"
			:description="desktopConfig.description"
			:size="size"
			@retry="status = 'ready'"
		>
			<template #navigation
				><a href="/" @click.prevent="navigation.navigate('/')">桌面</a
				><a href="/guide" @click.prevent="navigation.navigate('/guide')"
					>使用说明</a
				></template
			>
			<template #panel="scope"
				><ExamplePanel
					:id="scope.panel.id"
					:readonly="scope.readonly"
					:disabled="disabled || !!scope.panel.disabled"
					@lifecycle="lifecycle"
			/></template>
			<template #footer
				><span>{{
					route.path === '/guide'
						? '键盘：移动/缩放手柄使用方向键，Shift加速，Escape取消拖动。'
						: '布局不包含草稿或权限结果。'
				}}</span
				><span>ASAM / {{ family }}</span></template
			>
		</component>
	</AsamApplicationProvider>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AsamButton } from '@asam-ui/ui';
import type { AsamControlSize } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro';
import { createPreferences } from '../../app/preferences/Preferences.js';
import { browserStorage } from '../../app/preferences/Storage.js';
import type { Scope, ThemeChoice } from '../../app/preferences/Types.js';
import { createNavigation } from '../../app/navigation/Navigation.js';
import { createDesktop } from '../Desktop.js';
import MinimalDesktop from '../MinimalDesktop.vue';
import BrandDesktop from '../BrandDesktop.vue';
import TechDesktop from '../TechDesktop.vue';
import ExamplePanel from './ExamplePanel.vue';
import { desktopConfig, panels } from './config.js';
import type { DesktopFamily, PanelStatus } from '../Types.js';
const route = useRoute(),
	router = useRouter();
const query = new URLSearchParams(location.search);
const initialFamily = query.get('family');
const family = ref<DesktopFamily>(
	initialFamily === 'brand' || initialFamily === 'tech' ? initialFamily : 'minimal'
);
const size = ref<AsamControlSize>('default'),
	readOnly = ref(false),
	disabled = ref(false),
	permission = ref(true),
	mounted = ref(true);
const status = ref<PanelStatus>('ready'),
	identity = ref<'number' | 'string' | 'null'>('number');
const owner = computed<Scope>(() => [
	identity.value === 'number' ? 0 : identity.value === 'string' ? '0' : null
]);
const storage = browserStorage();
const preferences = createPreferences({
	app: desktopConfig.app,
	owner: [],
	storage,
	dictionaries: { zh: {} },
	fallbackLocale: 'zh',
	initial: { theme: family.value === 'tech' ? 'dark' : 'light' },
	system: window.matchMedia('(prefers-color-scheme: dark)')
});
const desktop = createDesktop({
	app: desktopConfig.app,
	owner: owner.value,
	scope: desktopConfig.scope,
	panels,
	storage
});
const navigation = createNavigation({
	router,
	components: {},
	load: async () => [],
	fallback: '/',
	scope: 'desktop'
});
const pages = { minimal: MinimalDesktop, brand: BrandDesktop, tech: TechDesktop };
const events: { event: string; id: string }[] = [];
function lifecycle(event: string, id: string) {
	if (query.has('test')) {
		events.push({ event, id });
		if (events.length > 512) events.shift();
	}
}
function themeChange(event: Event) {
	preferences.choose({ theme: (event.target as HTMLSelectElement).value as ThemeChoice });
}
watch([readOnly, disabled], () =>
	desktop.setPolicy({ readonly: readOnly.value, disabled: disabled.value })
);
watch([permission, status], () =>
	desktop.setPanels(
		panels.map((p) => ({
			...p,
			allowed: p.id !== 'notes' || permission.value,
			status: status.value
		}))
	)
);
watch(owner, async (next) => {
	desktop.setContext(next, desktopConfig.scope);
	await desktop.restore();
});
watch(family, () => preferences.choose({ theme: family.value === 'tech' ? 'dark' : 'light' }));
watch(mounted, () => {
	if (!mounted.value) desktop.dispose();
});
void desktop.restore();
onBeforeUnmount(() => {
	desktop.dispose();
	preferences.dispose();
	navigation.dispose();
});
if (query.has('test'))
	Object.assign(window, { desktopDemo: { desktop, preferences, navigation, events } });
</script>
<style>
body {
	margin: 0;
}
.desktop-demo-controls {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: center;
	padding: 12px 20px;
	font:
		12px system-ui,
		sans-serif;
	border-bottom: 1px solid var(--asam-color-border);
	color: var(--asam-color-text-primary);
	background: var(--asam-color-surface);
}
.desktop-demo-controls label {
	display: flex;
	align-items: center;
	gap: 4px;
}
.desktop-demo-controls select {
	color: inherit;
	background: var(--asam-color-surface);
	border: 1px solid var(--asam-color-border);
	padding: 4px;
	font: inherit;
}
.desktop nav a {
	margin-right: 16px;
	font-size: 12px;
	color: var(--asam-color-primary);
	text-underline-offset: 4px;
}
</style>
