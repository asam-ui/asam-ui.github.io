<template>
	<section>
		<h2>{{ props.label ?? text.t('page') }} · {{ route.params.id ?? text.t('home') }}</h2>
		<div data-asam-field-caption>
			{{ text.t('draft') }}
			<AsamInput v-model="draft" data-draft :aria-label="text.t('draft')" />
		</div>
		<div ref="scroll" class="state-scroll" @scroll="position = scroll?.scrollTop ?? 0">
			<p v-for="line in 30" :key="line">{{ text.t('line') }} {{ line }}</p>
		</div>
		<output>{{ text.t('scroll') }}{{ position }}{{ text.t('draft') }}{{ draft }}</output>
	</section>
</template>
<script setup lang="ts">
import { useExampleText } from './Texts.js';
const text = useExampleText();
import { AsamInput } from '@asam-ui/ui';
import { onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
const props = defineProps<{ label?: string }>();
const route = useRoute();
const draft = ref('');
const position = ref(0);
const scroll = ref<HTMLElement>();
const emit = defineEmits<{ (event: 'lifecycle', value: string): void }>();
onMounted(() => emit('lifecycle', 'mounted'));
onActivated(() => {
	if (scroll.value) scroll.value.scrollTop = position.value;
	emit('lifecycle', 'activated');
});
onDeactivated(() => emit('lifecycle', 'deactivated'));
onUnmounted(() => emit('lifecycle', 'unmounted'));
</script>
<style scoped>
.state-scroll {
	height: 160px;
	overflow: auto;
	border: 1px solid var(--el-border-color);
}
</style>
