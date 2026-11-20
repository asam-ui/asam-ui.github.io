<template><NavigationShell :controller="navigation" /></template>
<script setup lang="ts">
import { defineComponent, h, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createNavigation, NavigationShell } from '@asam-ui/pro/application/navigation';
const router = useRouter();
const Overview = defineComponent({ setup: () => () => h('p', '这里是本地概览页面。') });
const navigation = createNavigation({
	router,
	components: { overview: Overview },
	load: async () => [{ id: 'overview', path: '/overview', title: '概览', resource: 'overview' }],
	fallback: '/safe'
});
onMounted(async () => {
	await navigation.reload();
	await navigation.navigate('/overview');
});
onBeforeUnmount(() => navigation.dispose());
</script>
