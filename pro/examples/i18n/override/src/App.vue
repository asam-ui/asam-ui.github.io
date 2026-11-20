<template>
	<main>
		<h1>只覆盖一条组件消息</h1>
		<p>以下英文覆盖是宿主资源，其余词条继续使用包默认与回退。</p>
		<AsamButton @click="language = language === 'en' ? 'zh-CN' : 'en'">
			中文 / English
		</AsamButton>
		<AsamApplicationProvider :config="{ base: { i18n: scope } }">
			<AsamStatePanel :title="scope.t('pro.common.empty')" />
			<p data-override>{{ scope.t('pro.common.empty') }}</p>
			<AsamFormActions />
		</AsamApplicationProvider>
	</main>
</template>
<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { AsamButton, AsamFormActions } from '@asam-ui/ui';
import { AsamApplicationProvider, AsamStatePanel } from '@asam-ui/pro/components';
import { createAsamProI18n } from '@asam-ui/pro/i18n';
const language = ref<'zh-CN' | 'en'>('en');
const scope = createAsamProI18n(() => ({
	locale: language.value,
	messages: { en: { 'pro.common.empty': 'Nothing here yet — host override' } }
}));
onScopeDispose(scope.dispose);
</script>
