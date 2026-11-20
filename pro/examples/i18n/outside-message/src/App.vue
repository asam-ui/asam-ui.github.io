<template>
	<main>
		<h1>组件外已有消息的展示</h1>
		<p>切换时只重新读取已有反馈，不重试请求、不重跑校验、不改错误身份或原始记录。</p>
		<AsamButton @click="language = language === 'en' ? 'zh-CN' : 'en'">
			中文 / English
		</AsamButton>
		<p role="alert" data-outside>{{ text }}</p>
		<p>{{ errorText }}</p>
		<output data-original>
			{{
				JSON.stringify({
					message: feedback.issue.message,
					error: feedback.error.message,
					same: feedback.error === feedback.original
				})
			}}
		</output>
	</main>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { createAsamProI18n } from '@asam-ui/pro/i18n';
import { createFeedback } from './feedback';
const language = ref<'zh-CN' | 'en'>('zh-CN'),
	scope = createAsamProI18n(() => ({ locale: language.value }));
const feedback = createFeedback(scope),
	text = computed(feedback.issueText),
	errorText = computed(feedback.errorText);
onScopeDispose(scope.dispose);
</script>
