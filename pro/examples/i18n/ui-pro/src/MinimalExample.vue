<template>
	<AsamApplicationProvider :config="{ base: { i18n } }">
		<section aria-label="跟随宿主的语言作用域">
			<label for="i18n-draft">宿主草稿</label>
			<AsamInput id="i18n-draft" v-model="draft" />
			<AsamPagination v-model:current-page="page" :total="60" :page-size="10" />
			<AsamStatePanel :title="i18n.t('pro.common.empty')">
				<AsamButton @click="requests++">{{ i18n.t('pro.common.retry') }}</AsamButton>
			</AsamStatePanel>
			<p role="alert" data-translated-error>{{ displayError }}</p>
			<output data-preserved>
				{{ JSON.stringify({ draft, page, requests, original: issue.message }) }}
			</output>
		</section>
	</AsamApplicationProvider>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { AsamButton, AsamInput, AsamPagination } from '@asam-ui/ui';
import { AsamApplicationProvider, AsamStatePanel } from '@asam-ui/pro';
import { createAsamMessageIssue, createAsamProI18n, formatFieldIssue } from '@asam-ui/pro/i18n';

const props = defineProps<{ language: 'zh-CN' | 'en' }>();
const i18n = createAsamProI18n(() => ({ locale: props.language }));
const draft = ref('宿主输入保持原值');
const page = ref(2);
const requests = ref(0);
const issue = createAsamMessageIssue('原始必填错误', 'ui.form.required', { label: '姓名' });
const displayError = computed(() => formatFieldIssue(issue, i18n));
onScopeDispose(i18n.dispose);
</script>
