<template>
	<AsamBaseForm ref="form" :model="model">
		<AsamCustomField
			v-slot="scope"
			v-model="model.name"
			prop="name"
			label="姓名"
			:rules="[{ required: true, message: '请输入姓名', trigger: 'change' }]"
		>
			<CustomInput
				:model-value="String(scope.value ?? '')"
				@update:model-value="scope.update"
				@blur="scope.blur"
			/> </AsamCustomField
		><AsamButton @click="validate()">校验</AsamButton
		><AsamButton @click="form?.resetFields()">重置</AsamButton> </AsamBaseForm
	><output>{{ status }}</output>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { AsamBaseForm, AsamButton } from '@asam-ui/ui';
import type { AsamBaseFormExpose } from '@asam-ui/ui';
import { AsamCustomField } from '@asam-ui/pro/application/composables/use-custom-field-value';
import CustomInput from './CustomInput.vue';
const model = reactive({ name: '' });
const form = ref<AsamBaseFormExpose>();
const status = ref('');
async function validate() {
	status.value =
		(await form.value?.validate().then(
			() => '通过',
			() => '请检查字段'
		)) ?? '表单尚未挂载';
}
</script>
