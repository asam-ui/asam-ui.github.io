<template>
	<main>
		<h1>基础组件中英切换</h1>
		<p>这是宿主说明，语言按钮只切换组件消息；草稿属于宿主。</p>
		<AsamButton @click="language = language === 'zh-CN' ? 'en' : 'zh-CN'">
			中文 / English
		</AsamButton>
		<output data-locale>{{ language }}</output>
		<AsamConfigProvider :i18n="scope">
			<label for="basic-draft">宿主草稿</label>
			<AsamInput id="basic-draft" v-model="draft" />
			<AsamFormActions />
			<AsamPagination v-model:current-page="page" :total="60" :page-size="10" />
			<p data-message>{{ scope.t('ui.common.retry') }}</p>
		</AsamConfigProvider>
		<output data-model>{{ JSON.stringify({ draft, page }) }}</output>
	</main>
</template>
<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import {
	AsamButton,
	AsamConfigProvider,
	AsamInput,
	AsamPagination,
	AsamFormActions
} from '@asam-ui/ui';
import { createAsamI18n } from '@asam-ui/ui/i18n';
const language = ref<'zh-CN' | 'en'>('zh-CN'),
	draft = ref('宿主原值'),
	page = ref(2);
const scope = createAsamI18n(() => ({ locale: language.value }));
onScopeDispose(scope.dispose);
</script>
