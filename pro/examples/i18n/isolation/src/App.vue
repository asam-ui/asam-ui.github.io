<template>
	<main>
		<h1>嵌套与多根隔离</h1>
		<AsamButton @click="language = language === 'zh-CN' ? 'en' : 'zh-CN'">
			切换第一个根
		</AsamButton>
		<AsamConfigProvider :i18n="outer">
			<p data-outer>{{ outer.t('ui.common.retry') }}</p>
			<NestedScopes :parent="outer" />
		</AsamConfigProvider>
		<h2>第二个 Vue 根</h2>
		<div ref="secondRoot"></div>
	</main>
</template>
<script setup lang="ts">
import { createApp, onMounted, onScopeDispose, ref } from 'vue';
import type { App } from 'vue';
import { AsamButton, AsamConfigProvider } from '@asam-ui/ui';
import { createAsamI18n } from '@asam-ui/ui/i18n';
import NestedScopes from './NestedScopes.vue';
import StandaloneRoot from './StandaloneRoot.vue';
const language = ref<'zh-CN' | 'en'>('zh-CN'),
	secondRoot = ref<HTMLElement>();
const outer = createAsamI18n(() => ({ locale: language.value }));
let application: App | undefined;
onMounted(() => {
	if (!secondRoot.value) return;
	application = createApp(StandaloneRoot);
	application.mount(secondRoot.value);
});
onScopeDispose(() => {
	application?.unmount();
	outer.dispose();
});
</script>
