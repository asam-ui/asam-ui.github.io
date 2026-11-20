<template>
	<main>
		<h1>宿主显式保存语言偏好</h1>
		<p>
			本示例只使用自己 app/owner 的浏览器存储。重建 owner
			或刷新页面可恢复已选语言；组件不自行探测浏览器语言。
		</p>
		<AsamButton
			@click="owner.preferences.choose({ locale: selected === 'en' ? 'zh-CN' : 'en' })"
		>
			切换并保存
		</AsamButton>
		<AsamButton @click="restore">重新读取这个 owner</AsamButton>
		<output data-preference>{{ selected }}</output>
		<AsamApplicationProvider :config="{ base: { i18n: owner.i18n } }">
			<AsamFormActions />
			<p data-preference-message>
				{{ owner.i18n.t('pro.common.empty') }}
			</p>
		</AsamApplicationProvider>
	</main>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, shallowRef } from 'vue';
import { AsamButton, AsamFormActions } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro/components';
import { browserStorage, createPreferencesI18n } from '@asam-ui/pro/application/preferences';
const createOwner = () =>
	createPreferencesI18n({
		app: 'asam-i18n-website-example',
		owner: ['local-demo'],
		storage: browserStorage(),
		dictionaries: { 'zh-CN': { title: '演示宿主标题' }, en: { title: 'Demo host title' } },
		fallbackLocale: 'en',
		initial: { locale: 'en' }
	});
const owner = shallowRef(createOwner());
const selected = computed(() => owner.value.preferences.locale.value);
function restore() {
	owner.value.dispose();
	owner.value = createOwner();
}
onScopeDispose(() => owner.value.dispose());
</script>
