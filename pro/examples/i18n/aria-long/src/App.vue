<template>
	<main>
		<h1>长英文与可访问名称</h1>
		<p>
			长文案是演示宿主覆盖；原生分页的 ARIA 名称仍由组件语言桥接提供。可聚焦下方按钮后按 Tab
			检查自然顺序。
		</p>
		<AsamButton @click="language = language === 'en' ? 'zh-CN' : 'en'">
			中文 / English
		</AsamButton>
		<AsamConfigProvider :i18n="scope">
			<section class="long-copy">
				<AsamButton data-long-button :aria-label="scope.t('ui.common.retry')">
					{{ scope.t('ui.common.retry') }}
				</AsamButton>
				<AsamPagination :total="60" />
			</section>
		</AsamConfigProvider>
	</main>
</template>
<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { AsamButton, AsamConfigProvider, AsamPagination } from '@asam-ui/ui';
import { createAsamI18n } from '@asam-ui/ui/i18n';
const language = ref<'zh-CN' | 'en'>('en');
const scope = createAsamI18n(() => ({
	locale: language.value,
	messages: {
		en: {
			'ui.common.retry':
				'Retry loading the selected project records without losing the current draft or keyboard position'
		}
	}
}));
onScopeDispose(scope.dispose);
</script>
<style scoped>
.long-copy {
	max-width: 22rem;
}
.long-copy :deep(button) {
	max-width: 100%;
	height: auto;
	min-height: 2.5rem;
	white-space: normal;
}
.long-copy :deep(.el-button span) {
	white-space: normal;
	overflow-wrap: anywhere;
}
.long-copy :deep(.el-pagination) {
	flex-wrap: wrap;
}
</style>
