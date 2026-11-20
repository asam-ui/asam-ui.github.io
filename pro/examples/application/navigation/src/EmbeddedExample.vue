<template>
	<p>{{ demoText.intro }}</p>
	<AsamButton v-if="src" tag="a" :href="src" target="_blank" rel="noopener" type="primary">{{
		demoText.open
	}}</AsamButton>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { useAsamProI18n } from '@asam-ui/pro/i18n';
const i18n = useAsamProI18n();
// 这两条是演示宿主的说明，不是组件库内置消息。
const demoMessages = {
	'zh-CN': { intro: '此演示在独立标签中打开同源内容。', open: '打开示例内容' },
	en: {
		intro: 'This demo opens same-origin content in a separate tab.',
		open: 'Open example content'
	}
};
const demoText = computed(() => demoMessages[i18n.locale.value === 'en' ? 'en' : 'zh-CN']);
const src = ref('');
onMounted(() => {
	src.value = `${location.origin}/pro/embedded.html`;
});
</script>
