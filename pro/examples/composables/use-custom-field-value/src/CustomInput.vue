<template>
	<AsamInput
		:model-value="modelValue"
		:validate-event="false"
		aria-label="自定义姓名"
		@update:model-value="emit('update:modelValue', String($event))"
		@blur="emit('blur')"
	/>
</template>
<script setup lang="ts">
import { AsamInput } from '@asam-ui/ui';
import { useCustomFieldValue } from '@asam-ui/pro/application/composables/use-custom-field-value';
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>();
useCustomFieldValue(() => props.modelValue);
</script>
