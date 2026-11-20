<template>
	<main class="i18n-example">
		<h1>统一语言作用域</h1>
		<p>切换库的默认文案与原生组件语言，保留宿主草稿、当前页和已有错误的原始信息。</p>
		<AsamButton @click="language = language === 'zh-CN' ? 'en' : 'zh-CN'">
			中文 / English
		</AsamButton>
		<output data-language>{{ language }}</output>
		<MinimalExample :language="language" />
		<section aria-label="独立英语作用域">
			<h2>独立作用域</h2>
			<AsamConfigProvider :i18n="independent">
				<p data-independent>{{ independent.t('pro.common.empty') }}</p>
			</AsamConfigProvider>
		</section>
	</main>
</template>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { AsamButton, AsamConfigProvider } from '@asam-ui/ui';
import { createAsamProI18n } from '@asam-ui/pro/i18n';
import MinimalExample from './MinimalExample.vue';

const language = ref<'zh-CN' | 'en'>('zh-CN');
const independent = createAsamProI18n({ locale: 'en' });
onScopeDispose(independent.dispose);
</script>

<style scoped>
.i18n-example {
	max-width: 960px;
	margin: auto;
	padding: 24px;
}
output {
	margin-inline-start: 12px;
}
</style>
