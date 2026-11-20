<template>
	<p>关联子项：{{ children.length }}</p>
	<AsamButton @click="items.reverse()">反转顺序</AsamButton
	><AsamButton @click="items.pop()">移除末项</AsamButton
	><Child v-for="id in items" :id="id" :key="id" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { useChildren } from '@asam-ui/pro/application/composables/use-relation';
import { relationKey } from './relation.js';
import Child from './RelationChild.vue';
const items = ref(['A', 'B', 'C']);
const { children, linkChildren } = useChildren(relationKey);
linkChildren();
</script>
