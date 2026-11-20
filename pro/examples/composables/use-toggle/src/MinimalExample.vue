<template>
	<p role="status">{{ visible ? '已打开' : '已关闭' }}</p>
	<AsamButton @click="toggle()">切换</AsamButton
	><AsamButton @click="toggle(false)">关闭</AsamButton>
</template>
<script setup lang="ts">
import { AsamButton } from '@asam-ui/ui';
import { useToggle } from '@asam-ui/pro/application/composables/use-toggle';
const [visible, toggle] = useToggle(false);
</script>
