<template>
	<AsamButton @click="shown = !shown">切换缓存区域</AsamButton
	><KeepAlive><Activity v-if="shown" @active="count++" /></KeepAlive
	><output>执行次数：{{ count }}</output>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import Activity from './LifecycleActivity.vue';
const shown = ref(true);
const count = ref(0);
</script>
