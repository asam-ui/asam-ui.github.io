<template>
	<main>
		<h1>SSR 核心接入</h1>
		<p>
			浏览器显示普通组件语言。下载工程后执行 pnpm run ssr：两个并行请求各自创建和释放
			scope，输出各自 HTML；此例不声明 hydration 或完整原生日期控件资格。
		</p>
		<AsamButton @click="language = language === 'en' ? 'zh-CN' : 'en'">
			中文 / English
		</AsamButton>
		<AsamApplicationProvider :config="{ base: { i18n: scope } }">
			<p>{{ scope.t('pro.common.empty') }}</p>
		</AsamApplicationProvider>
	</main>
</template>
<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro/components';
import { createAsamProI18n } from '@asam-ui/pro/i18n';
const language = ref<'zh-CN' | 'en'>('en'),
	scope = createAsamProI18n(() => ({ locale: language.value }));
onScopeDispose(scope.dispose);
</script>
