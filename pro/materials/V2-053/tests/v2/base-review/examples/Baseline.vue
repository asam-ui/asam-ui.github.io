<template>
	<main>
		<h1>基础公开契约复核</h1>
		<label
			>应用尺寸<select v-model="size" aria-label="应用尺寸">
				<option v-for="s in sizes" :key="s">{{ s }}</option>
			</select></label
		>
		<button @click="dark = !dark">切换主题</button>
		<button @click="custom = !custom">切换品牌</button>
		<button @click="mounted = !mounted">切换挂载</button>
		<button @click="disabled = !disabled">切换禁用</button>
		<button @click="readonly = !readonly">切换只读</button>
		<button @click="empty = !empty">切换空数据</button>
		<button id="tour-target" @click="tour = true">打开导览</button>
		<AsamTour v-model="tour" :mask="false" :show-arrow="false" :close-on-press-escape="true">
			<AsamTourStep target="#tour-target" title="基础导览" description="原生步骤" />
			<template #indicators="scope"
				><span>{{ scope.current }}/{{ scope.total }}</span></template
			>
		</AsamTour>
		<output aria-label="导览状态">{{ tour }}</output>
		<label
			>Form尺寸<select v-model="formSize" aria-label="Form尺寸">
				<option value="">继承</option>
				<option v-for="s in sizes" :key="s">{{ s }}</option>
			</select></label
		>
		<label
			>Group尺寸<select v-model="groupSize" aria-label="Group尺寸">
				<option value="">继承</option>
				<option v-for="s in sizes" :key="s">{{ s }}</option>
			</select></label
		>
		<AsamApplicationProvider v-if="mounted" :config="config">
			<section data-testid="surface">
				<AsamBaseForm :size="formSize || undefined" :disabled="disabled" :model="model">
					<AsamButton data-testid="form-button">Form继承</AsamButton>
					<AsamButtonGroup :size="groupSize || undefined">
						<AsamButton data-testid="group-button" @click="count++"
							>Group继承</AsamButton
						>
						<AsamButton size="small" data-testid="explicit-button"
							>显式small</AsamButton
						>
					</AsamButtonGroup>
					<AsamInput
						ref="input"
						v-model="model.name"
						aria-label="名称"
						:readonly="readonly"
						clearable
						@input="events.push('input')"
						@change="events.push('change')"
						><template #prefix><span>前缀</span></template></AsamInput
					>
					<AsamPassword v-model="password" aria-label="密码" :readonly="readonly" />
					<AsamTextarea
						v-model="description"
						aria-label="备注"
						:rows="4"
						:readonly="readonly"
					/>
					<AsamSelect
						v-model="selected"
						aria-label="选择"
						:options="options"
						value-mode="value"
						:multiple="false"
						:allow-create="false"
						clearable
					/>
					<AsamDatePicker v-model="date" aria-label="日期" />
					<AsamCheckboxGroup v-model="checked"
						><AsamCheckboxItem value="a">选项A</AsamCheckboxItem></AsamCheckboxGroup
					>
				</AsamBaseForm>
				<AsamConfigProvider size="small"
					><AsamButton data-testid="nested-button"
						>嵌套small</AsamButton
					></AsamConfigProvider
				>
				<AsamButton loading>加载操作</AsamButton>
				<AsamAlert v-if="empty" title="暂无可选数据" type="info" :closable="false" />
				<AsamAlert v-else title="可恢复的错误提示" type="error" :closable="false" />
				<AsamButton type="primary" @click="input?.focus()">公开focus</AsamButton>
				<AsamButton @click="input?.clear()">公开clear</AsamButton>
				<AsamButton @click="notify">原生服务</AsamButton>
				<output aria-label="模型">{{ model.name }}</output>
				<output aria-label="事件">{{ events.join(',') }}</output>
				<output aria-label="计数">{{ count }}</output>
			</section>
		</AsamApplicationProvider>
		<AsamButton data-testid="independent-button">独立默认</AsamButton>
	</main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	AsamAlert,
	AsamBaseForm,
	AsamButton,
	AsamButtonGroup,
	AsamCheckboxGroup,
	AsamCheckboxItem,
	AsamConfigProvider,
	AsamDatePicker,
	AsamInput,
	AsamMessage,
	AsamPassword,
	AsamSelect,
	AsamTextarea,
	AsamTour,
	AsamTourStep,
	asamControlSizes
} from '@asam-ui/ui';
import type { AsamControlSize, AsamInputExpose } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro';
import type { AsamApplicationConfig } from '@asam-ui/pro';
const sizes = asamControlSizes;
const size = ref<AsamControlSize>('big');
const formSize = ref<AsamControlSize | ''>('');
const groupSize = ref<AsamControlSize | ''>('');
const dark = ref(false),
	custom = ref(false),
	mounted = ref(true);
const disabled = ref(false),
	readonly = ref(false),
	empty = ref(false);
const input = ref<AsamInputExpose>();
const model = ref({ name: '初始值' });
const password = ref('secret'),
	description = ref('多行备注');
const selected = ref<string | null>(null),
	checked = ref<string[]>([]);
const date = ref<Date | null>(null),
	count = ref(0),
	events = ref<string[]>([]);
const tour = ref(false);
const options = computed(() =>
	empty.value ? [] : [{ value: 'a', label: '选项A', raw: { id: 'a' } }]
);
const config = computed<AsamApplicationConfig>(() => ({
	size: size.value,
	colorMode: dark.value ? 'dark' : 'light',
	theme: custom.value ? { color: { primary: '#7a315c' } } : null
}));
function notify() {
	AsamMessage({ message: '正常包服务', duration: 100 });
}
</script>

<style scoped>
main {
	padding: 24px;
	max-width: 100%;
}
section {
	display: grid;
	gap: 12px;
	padding: 16px;
}
label {
	display: inline-flex;
	gap: 8px;
	margin: 8px;
}
button {
	margin: 4px;
}
</style>
