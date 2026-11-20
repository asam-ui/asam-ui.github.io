<template>
	<ElTour
		v-bind="{ ...$attrs, ...suppliedNativeProps(props, self?.vnode.props) }"
		class="asam-tour"
		@update:model-value="emit('update:modelValue', $event)"
		@update:current="emit('update:current', $event)"
		@close="emit('close', $event)"
		@finish="emit('finish')"
		@change="emit('change', $event)"
	>
		<template v-if="$slots.default" #default><slot /></template>
		<template v-if="$slots.indicators" #indicators="scope">
			<slot name="indicators" v-bind="scope" />
		</template>
	</ElTour>
</template>

<script setup lang="ts">
import { ElTour } from 'element-plus';
import { getCurrentInstance } from 'vue';
import { suppliedNativeProps } from '../AsamDialog/NativeDelegation.js';
import type { AsamTourProps, AsamTourEmits, AsamTourSlots } from './Types.js';

defineOptions({ name: 'AsamTour', inheritAttrs: false });
const props = defineProps<AsamTourProps>();
const emit = defineEmits<AsamTourEmits>();
defineSlots<AsamTourSlots>();
const self = getCurrentInstance();
</script>
