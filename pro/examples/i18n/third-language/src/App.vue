<template>
	<main>
		<h1>注册第三语言片段</h1>
		<p>
			法语只注册下列两条 ASAM 消息，其余按英文回退；原生分页使用 Element Plus 的完整法语
			locale。此片段不代表 ASAM 内置完整法语或 RTL。
		</p>
		<AsamButton v-for="locale in languages" :key="locale" @click="language = locale">
			{{ locale }}
		</AsamButton>
		<output data-locale>{{ language }}</output>
		<AsamApplicationProvider :config="{ base: { i18n: scope } }">
			<p data-third>{{ scope.t('pro.common.empty') }}</p>
			<AsamButton>{{ scope.t('ui.common.retry') }}</AsamButton>
			<AsamPagination :total="60" />
		</AsamApplicationProvider>
	</main>
</template>
<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { AsamButton, AsamPagination } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro/components';
import { createAsamProI18n } from '@asam-ui/pro/i18n';
import nativeFrench from 'element-plus/es/locale/lang/fr';
const languages = ['zh-CN', 'en', 'fr'] as const;
const language = ref<(typeof languages)[number]>('fr');
const scope = createAsamProI18n(() => ({
	locale: language.value,
	fallbackLocale: 'en',
	languages: {
		fr: {
			messages: { 'ui.common.retry': 'Réessayer', 'pro.common.empty': 'Aucun contenu' },
			nativeLocale: nativeFrench
		}
	}
}));
onScopeDispose(scope.dispose);
</script>
