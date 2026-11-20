<template>
	<AsamApplicationProvider
		:config="{
			size,
			colorMode: preferences.colorMode.value,
			base: { i18n: i18nScope }
		}"
		class="preferences-app"
		:data-mode="preferences.colorMode.value"
		><Teleport to="#preview-settings-extra" :disabled="!websitePreviewControls"
			><WebsiteAsamConfigProvider size="default"
				><section class="preview-control-group">
					<header>
						<h1>{{ preferences.t('title') }}</h1>
						<div data-asam-field-caption>
							{{ preferences.t('language') }}
							<AsamSelect
								data-language
								:aria-label="preferences.t('language')"
								:model-value="preferences.locale.value"
								@change="chooseLocale"
								><AsamOption
									v-for="language in Object.keys(dictionaries)"
									:key="language"
									:value="language"
									:label="language"
							/></AsamSelect>
						</div>
						<div data-asam-field-caption>
							{{ preferences.t('theme') }}
							<span
								v-show="!websitePreviewControls"
								data-preview-theme-control
								:data-preview-value="preferences.theme.value"
								v-on="{ 'asam-preview-theme': websitePreviewTheme0 }"
								><AsamSelect
									data-theme
									:aria-label="preferences.t('theme')"
									:model-value="preferences.theme.value"
									@change="chooseTheme"
									><AsamOption
										v-for="mode in themes"
										:key="mode"
										:value="mode"
										:label="preferences.t(mode)" /></AsamSelect
							></span>
						</div>
						<span
							>{{ preferences.t('effective') }}:
							{{ preferences.colorMode.value }}</span
						>
						<div data-asam-field-caption>
							{{ preferences.t('size') }}
							<AsamSelect v-model="size" data-size :aria-label="preferences.t('size')"
								><AsamOption
									v-for="item in sizes"
									:key="item"
									:value="item"
									:label="item"
							/></AsamSelect>
						</div>
						<AsamButton @click="preferences.reset()" type="primary">{{
							preferences.t('reset')
						}}</AsamButton>
						<div data-asam-field-caption>
							{{ preferences.t('storage') }}
							<AsamSelect
								v-model="storageMode"
								data-storage
								:aria-label="preferences.t('storage')"
								><AsamOption
									value="normal"
									:label="preferences.t('normal')" /><AsamOption
									value="memory"
									:label="preferences.t('memory')" /><AsamOption
									value="throwing"
									:label="preferences.t('throwing')"
							/></AsamSelect>
						</div>
					</header></section></WebsiteAsamConfigProvider></Teleport
		><AsamAdminLayout
			v-model:settings="layoutSettings"
			:size="size"
			:menu-label="preferences.t('menu')"
			:sidebar-label="preferences.t('menu')"
			><template #header>{{ preferences.t('app') }}</template
			><template #sidebar
				><AsamMenu
					:default-active="activeRoute"
					background-color="var(--asam-color-surface)"
					text-color="var(--asam-color-text-primary)"
					active-text-color="var(--asam-color-primary)"
					@select="selectMenu"
					><AsamMenuItem
						v-for="item in controller.visibleMenu.value"
						:key="item.id"
						:index="item.id"
						>{{ preferences.t(item.title) }}</AsamMenuItem
					></AsamMenu
				></template
			>
			<div role="tablist" :aria-label="preferences.t('app')" class="tabs">
				<div v-for="tab in controller.tabs.value" :key="tab.id">
					<AsamButton
						role="tab"
						type="primary"
						:text="tab.id !== controller.active.value"
						:tabindex="tab.id === controller.active.value ? 0 : -1"
						:aria-selected="tab.id === controller.active.value"
						@keydown="tabKey($event)"
						@click="controller.navigate(tab.fullPath)"
						>{{ preferences.t(tab.title) }}</AsamButton
					><AsamButton
						v-if="!tab.pinned"
						:aria-label="preferences.t('close') + ' ' + preferences.t(tab.title)"
						@click="controller.close([tab.id])"
						type="primary"
					>
						×
					</AsamButton>
				</div>
			</div>
			<AsamButton @click="controller.refresh()" type="primary">{{
				preferences.t('refresh')
			}}</AsamButton
			><AsamPageContainer :title="preferences.t(activeRoute || 'home')"
				><NavigationView :controller="controller" /></AsamPageContainer
			><Teleport to="#preview-settings-extra" :disabled="!websitePreviewControls"
				><WebsiteAsamConfigProvider size="default"
					><section class="preview-control-group">
						<section class="cache-panel">
							<div data-asam-field-caption>
								{{ preferences.t('scope') }}
								<AsamSelect
									data-scope
									:aria-label="preferences.t('scope')"
									:model-value="scope"
									@change="switchScope"
									><AsamOption value="A" label="A" /><AsamOption
										value="B"
										label="B"
								/></AsamSelect>
							</div>
							<AsamInput
								v-model="cacheDraft"
								data-cache-draft
								:aria-label="preferences.t('notes')"
							/><AsamButton
								data-save
								@click="cache.write('notes', cacheDraft)"
								type="primary"
								>{{ preferences.t('save') }}</AsamButton
							><AsamButton data-read @click="cache.read('notes')" type="primary">{{
								preferences.t('read')
							}}</AsamButton
							><AsamButton data-clear @click="cache.clear()" type="primary">{{
								preferences.t('clear')
							}}</AsamButton>
							<p data-cache>{{ cache.value.value ?? preferences.t('empty') }}</p>
							<p>{{ preferences.t('expire') }}: {{ cacheTtl }}ms</p>
						</section>
					</section></WebsiteAsamConfigProvider
				></Teleport
			>
			<p role="status" data-status>
				{{ preferences.t('storage') }}: {{ preferences.status.value }} /
				{{ cache.status.value }} — <br /><span data-preference-feedback>{{
					preferences.t('preferences.' + preferences.status.value)
				}}</span
				><br /><span data-cache-feedback>{{
					preferences.t('cache.' + cache.status.value)
				}}</span>
			</p></AsamAdminLayout
		>
		<aside v-if="showPreview">
			<AsamApplicationProvider :config="{ colorMode: 'light' }"
				><p data-preview>{{ preferences.t('preview') }}</p></AsamApplicationProvider
			>
		</aside>
		<AsamButton data-preview-toggle @click="showPreview = !showPreview" type="primary">{{
			preferences.t(showPreview ? 'destroy' : 'restore')
		}}</AsamButton></AsamApplicationProvider
	>
</template>
<script setup lang="ts">
import { AsamConfigProvider as WebsiteAsamConfigProvider } from '@asam-ui/ui';
const websitePreviewControls =
	typeof document !== 'undefined' && !!document.getElementById('preview-settings-extra');
function websitePreviewTheme0(event: CustomEvent<'light' | 'dark'>) {
	chooseTheme(event.detail);
}
function websiteNativeEvent(value: unknown, type: string) {
	const event = new Event(type);
	Object.defineProperty(event, 'target', { value: { value, checked: value } });
	return event;
}

import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	AsamApplicationProvider,
	AsamAdminLayout,
	AsamPageContainer
} from '@asam-ui/pro/components';
import { AsamButton, AsamInput, AsamMenu, AsamMenuItem, AsamOption, AsamSelect } from '@asam-ui/ui';
import type { AsamControlSize } from '@asam-ui/ui';
import type { AsamLayoutSettingsValue } from '@asam-ui/pro/components';
import { createNavigation, NavigationView } from '@asam-ui/pro/application/navigation';
import {
	createPreferences,
	bindPreferencesI18n,
	createBusinessCache,
	browserStorage,
	memoryStorage
} from '@asam-ui/pro/application/preferences';
import type { StorageAdapter, ThemeChoice } from '@asam-ui/pro/application/preferences';
import { dictionaries } from './dictionaries.js';
import BusinessPage from './BusinessPage.vue';
import { preferenceKey } from './context.js';
const normal = browserStorage();
const memory = memoryStorage();
const storageMode = ref('normal');
const storage: StorageAdapter = {
	getItem(key) {
		if (storageMode.value === 'throwing') throw new Error('demo failure');
		return (storageMode.value === 'memory' ? memory : normal)?.getItem(key) ?? null;
	},
	setItem(key, value) {
		if (storageMode.value === 'throwing' || (!normal && storageMode.value === 'normal'))
			throw new Error('demo unavailable');
		(storageMode.value === 'memory' ? memory : normal)!.setItem(key, value);
	},
	removeItem(key) {
		if (storageMode.value === 'throwing' || (!normal && storageMode.value === 'normal'))
			throw new Error('demo unavailable');
		(storageMode.value === 'memory' ? memory : normal)!.removeItem(key);
	}
};
const preferences = createPreferences({
	app: 'preferences-example',
	owner: ['demo-user'],
	storage,
	dictionaries,
	fallbackLocale: 'zh-CN',
	initial: { locale: 'zh-CN', theme: 'system' },
	system:
		typeof window === 'undefined'
			? undefined
			: window.matchMedia('(prefers-color-scheme: dark)')
});
const i18nScope = bindPreferencesI18n(preferences, { fallbackLocale: 'zh-CN' });
provide(preferenceKey, preferences);
const themes: ThemeChoice[] = ['light', 'dark', 'system'];
const sizes: AsamControlSize[] = ['small', 'default', 'big', 'large'];
const size = ref<AsamControlSize>('default');
const layoutSettings = ref<Partial<AsamLayoutSettingsValue>>({});
const scope = ref('A');
const cacheTtl = 1500;
const cache = createBusinessCache({
	app: 'preferences-example',
	owner: ['demo-user'],
	scope: [scope.value],
	storage,
	version: 1,
	ttl: cacheTtl,
	validate: (value): value is string => typeof value === 'string'
});
const cacheDraft = ref('');
const showPreview = ref(true);
const router = useRouter();
const controller = createNavigation({
	i18n: i18nScope,
	router,
	components: { business: BusinessPage },
	fallback: '/safe',
	load: async () => [
		{ id: 'home', path: '/home', title: 'home', resource: 'business', pinned: true },
		{ id: 'notes', path: '/notes', title: 'notes', resource: 'business' }
	]
});
const activeRoute = computed(
	() => controller.tabs.value.find((tab) => tab.id === controller.active.value)?.routeId ?? ''
);
async function tabKey(event: KeyboardEvent) {
	if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
	event.preventDefault();
	const buttons = [
		...((event.currentTarget as HTMLElement)
			.closest('[role="tablist"]')
			?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
	];
	const current = buttons.indexOf(event.currentTarget as HTMLButtonElement);
	const index =
		event.key === 'Home'
			? 0
			: event.key === 'End'
				? buttons.length - 1
				: (current + (event.key === 'ArrowLeft' ? -1 : 1) + buttons.length) %
					buttons.length;
	const tab = controller.tabs.value[index];
	if (tab && (await controller.navigate(tab.fullPath))) {
		await nextTick();
		buttons[index]?.focus();
	}
}
function selectMenu(id: string) {
	const item = controller.visibleMenu.value.find((entry) => entry.id === id);
	if (item) void controller.navigate(item.path);
}
function chooseLocale(value: unknown) {
	if (typeof value === 'string') preferences.choose({ locale: value });
}
function chooseTheme(value: unknown) {
	if (value === 'light' || value === 'dark' || value === 'system')
		preferences.choose({ theme: value });
}
function switchScope(value: unknown) {
	if (typeof value !== 'string') return;
	scope.value = value;
	cache.switchScope([scope.value]);
}
onMounted(async () => {
	await controller.reload();
	if (router.currentRoute.value.path === '/') await controller.navigate('/home', true);
});
onBeforeUnmount(() => {
	i18nScope.dispose();
	preferences.dispose();
	cache.dispose();
	controller.dispose();
});
defineExpose({ preferences, cache, controller, i18nScope });
</script>
<style>
.preferences-app {
	min-height: 100%;
	background: var(--asam-color-surface);
	color: var(--asam-color-text-primary);
}
.preferences-app header,
.cache-panel,
.tabs {
	display: flex;
	flex-wrap: wrap;
	gap: var(--asam-space-3, 12px);
	padding: var(--asam-space-4, 16px);
	align-items: center;
}
.preferences-app h1 {
	flex-basis: 100%;
	font-size: var(--asam-font-size-xl, 24px);
}
.preferences-app .asam-select {
	min-width: 140px;
	max-width: 100%;
}
.preferences-app [aria-selected='true'] {
	border-color: var(--asam-color-primary);
}
.preferences-app section,
.preferences-app aside {
	padding: var(--asam-space-4, 16px);
	min-width: 0;
}
.preferences-app [data-cache] {
	overflow-wrap: anywhere;
}
@media (max-width: 500px) {
	.preferences-app header [data-asam-field-caption] {
		width: 100%;
	}
}
</style>
