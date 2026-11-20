<template>
	<p role="status">{{ preferences.locale.value }}：{{ preferences.t('hello') }}</p>
	<AsamButton @click="preferences.choose({ locale: 'zh-CN' })" type="primary">中文</AsamButton
	><AsamButton @click="preferences.choose({ locale: 'en' })" type="primary">English</AsamButton
	><AsamButton @click="preferences.reset()" type="primary">恢复默认偏好</AsamButton>
</template>
<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { createPreferences, memoryStorage } from '@asam-ui/pro/application/preferences';
const preferences = createPreferences({
	app: 'preferences-minimal',
	owner: ['local-demo'],
	storage: memoryStorage(),
	dictionaries: { 'zh-CN': { hello: '你好' }, en: { hello: 'Hello' } },
	fallbackLocale: 'zh-CN'
});
onBeforeUnmount(() => preferences.dispose());
</script>
