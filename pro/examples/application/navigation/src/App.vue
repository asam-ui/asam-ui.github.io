<template>
	<AsamApplicationProvider
		class="navigation-example"
		:config="{ size, colorMode: dark ? 'dark' : 'light' }"
		><Teleport to="#preview-settings-extra" :disabled="!websitePreviewControls"
			><WebsiteAsamConfigProvider size="default"
				><section class="preview-control-group">
					<header class="example-controls">
						<span
							v-show="!websitePreviewControls"
							data-preview-theme-control
							:data-preview-value="dark"
							v-on="{ 'asam-preview-theme': websitePreviewTheme0 }"
							><AsamCheckboxItem v-model="dark" border>{{
								text.t('dark')
							}}</AsamCheckboxItem></span
						><!-- prettier-ignore -->
						<div data-asam-field-caption>{{ text.t('size') }}
				<AsamSelect v-model="size" :aria-label="text.t('size')"><AsamOption
						v-for="value in sizes"
						:key="value"
						:value="value"
						:label="value"
					 /></AsamSelect></div>
						<AsamCheckboxItem v-model="allowLeave" border>{{
							text.t('allowLeave')
						}}</AsamCheckboxItem
						><!-- prettier-ignore --><AsamButton @click="controller.navigate('/people/2?view=detail')" type="primary">{{ text.t('people2') }}</AsamButton
						><!-- prettier-ignore --><AsamButton @click="controller.navigate('/people/3?view=detail')" type="primary">{{ text.t('people3') }}</AsamButton
						><AsamButton @click="removePeople" type="primary">{{
							text.t('removePeople')
						}}</AsamButton
						><AsamButton @click="rename" type="primary">{{
							text.t('rename')
						}}</AsamButton
						><AsamButton @click="controller.navigate('/embed')" type="primary">{{
							text.t('embed')
						}}</AsamButton
						><AsamButton @click="router.back()" type="primary">{{
							text.t('back')
						}}</AsamButton
						><AsamButton @click="router.forward()" type="primary">{{
							text.t('forward')
						}}</AsamButton>
					</header>
				</section></WebsiteAsamConfigProvider
			></Teleport
		><NavigationShell :controller="controller" :size="size"
	/></AsamApplicationProvider>
</template>
<script setup lang="ts">
import { AsamConfigProvider as WebsiteAsamConfigProvider } from '@asam-ui/ui';
const websitePreviewControls =
	typeof document !== 'undefined' && !!document.getElementById('preview-settings-extra');
function websitePreviewTheme0(event: CustomEvent<'light' | 'dark'>) {
	dark.value = event.detail === 'dark';
}

import { useExampleText } from './Texts.js';
const text = useExampleText();
import { AsamButton, AsamCheckboxItem, AsamSelect, AsamOption } from '@asam-ui/ui';

import { onMounted, provide, reactive, ref } from 'vue';
import { AsamApplicationProvider } from '@asam-ui/pro/components';
import { useRouter } from 'vue-router';
import type { AsamControlSize } from '@asam-ui/ui';
import { createNavigation, NavigationShell } from '@asam-ui/pro/application/navigation';
import type { NavigationItem } from '@asam-ui/pro/application/navigation';
import TrackedPage from './TrackedPage.vue';
import EmbeddedExample from './EmbeddedExample.vue';
import { lifecycleKey } from './Lifecycle.js';
const router = useRouter();
const dark = ref(false);
const sizes: AsamControlSize[] = ['small', 'default', 'big', 'large'];
const size = ref<AsamControlSize>('default');
const allowLeave = ref(true);
let data: NavigationItem[] = [
	{ id: 'home', path: '/home', title: '工作台', resource: 'home', pinned: true },
	{
		id: 'people',
		parentId: 'home',
		path: '/people/:id',
		location: '/people/1',
		title: '人员资料',
		resource: 'people'
	},
	{ id: 'embed', path: '/embed', title: '嵌入', resource: 'embed', cache: false }
];
const lifecycle = reactive<Record<string, number>>({});
provide(lifecycleKey, lifecycle);
const controller = createNavigation({
	i18n: text.scope,
	router,
	components: { home: TrackedPage, people: TrackedPage, embed: EmbeddedExample },
	load: async () => data,
	fallback: '/safe',
	confirm: () => allowLeave.value,
	maxCache: 10
});
function removePeople() {
	data = data.filter((item) => item.id !== 'people');
	void controller.reload();
}
function rename() {
	data = data.map((item) => ({ ...item, title: `${item.title}（已修改）` }));
	void controller.reload();
}
onMounted(async () => {
	await controller.reload();
	if (router.currentRoute.value.path === '/') await controller.navigate('/home', true);
});
defineExpose({ controller, lifecycle });
</script>
<style>
.example-controls {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	padding: 12px;
}
.navigation-example {
	background: var(--el-bg-color-page);
	color: var(--el-text-color-primary);
	min-height: 100%;
}
</style>
