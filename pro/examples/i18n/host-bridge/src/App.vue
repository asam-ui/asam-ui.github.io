<template>
	<main>
		<h1>读取宿主业务语言</h1>
		<p>标题来自演示宿主字典，ASAM 只单向读取同一 locale ref，不替宿主翻译业务内容。</p>
		<AsamButton @click="host.locale.value = host.locale.value === 'en' ? 'zh-CN' : 'en'">
			切换宿主语言
		</AsamButton>
		<h2 data-business>{{ host.title() }}</h2>
		<AsamApplicationProvider :config="{ base: { i18n: scope } }">
			<AsamFormActions />
			<p data-library>{{ scope.t('pro.common.empty') }}</p>
		</AsamApplicationProvider>
	</main>
</template>
<script setup lang="ts">
import { onScopeDispose } from 'vue';
import { AsamButton, AsamFormActions } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro/components';
import { createAsamProI18n } from '@asam-ui/pro/i18n';
import { createHostLanguage } from './host';
const host = createHostLanguage();
const scope = createAsamProI18n(() => ({ locale: host.locale.value }));
onScopeDispose(scope.dispose);
</script>
