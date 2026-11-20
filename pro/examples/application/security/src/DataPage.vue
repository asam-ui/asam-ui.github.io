<template>
	<section :aria-label="text.t('data')">
		<p role="status">
			{{ error ? text.t('readFailed') : text.t(loading ? 'loading' : 'ready') }}
		</p>
		<ul>
			<li v-for="row in rows" :key="row">{{ row }}</li>
		</ul>
		<!-- prettier-ignore -->
		<div data-asam-field-caption>{{ text.t('select') }}
			<AsamInput v-model="selected" :aria-label="text.t('select')"  /></div>
		<!-- prettier-ignore -->
		<div data-asam-field-caption>{{ text.t('draft') }}
			<AsamInput v-model="draft" :aria-label="text.t('draft')"  /></div>
		<AsamPermission v-slot="permission" permission="record:write" mode="disable"
			><AsamButton
				:disabled="permission.disabled || writeDenied"
				@click="save"
				type="primary"
				>{{ text.t('save') }}</AsamButton
			></AsamPermission
		><AsamButton @click="load" type="primary">{{ text.t('retry') }}</AsamButton
		><output aria-live="polite">{{ result ? text.t(result) : '' }}</output>
	</section>
</template>
<script setup lang="ts">
import { useExampleText } from './Texts.js';
const text = useExampleText();
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { AsamButton, AsamInput } from '@asam-ui/ui';
import { AsamPermission } from '@asam-ui/pro/components';
import { applicationKey } from './Context.js';
const application = inject(applicationKey);
if (!application) throw new Error('Missing application');
const { security, fixture } = application;
const writeDenied = computed(
	() => security.check({ permission: 'record:write', write: true }) !== 'allowed'
);
const rows = ref<string[]>([]);
const draft = ref('');
const selected = ref('');
const result = ref<'denied' | 'saved' | ''>('');
const error = ref(false);
const loading = ref(false);
let generation = 0;
let alive = true;
function clear() {
	generation++;
	rows.value = [];
	draft.value = '';
	selected.value = '';
	result.value = '';
	error.value = false;
	loading.value = false;
}
const remove = security.onInvalidate(clear);
async function load() {
	const subject = security.state.value.subject;
	if (!subject || security.check({ permission: 'workspace:read' }) !== 'allowed') return;
	const token = ++generation;
	const epoch = security.state.value.epoch;
	loading.value = true;
	error.value = false;
	try {
		const value = await fixture.read(subject);
		if (alive && token === generation && epoch === security.state.value.epoch)
			rows.value = value;
	} catch {
		if (alive && token === generation && epoch === security.state.value.epoch)
			error.value = true;
	} finally {
		if (alive && token === generation) loading.value = false;
	}
}
function save() {
	// UI visibility is insufficient; check immediately before calling the host write adapter.
	if (security.check({ permission: 'record:write', write: true }) !== 'allowed') {
		result.value = 'denied';
		return;
	}
	result.value = 'saved';
}
onMounted(load);
onBeforeUnmount(() => {
	alive = false;
	clear();
	remove();
});
</script>
