<template>
	<p role="status">会话：{{ state.status }}；{{ state.subject?.name ?? '尚未登录' }}</p>
	<AsamButton @click="security.login('editor')" type="primary">登录本地演示身份</AsamButton
	><AsamButton :disabled="!state.subject" @click="security.expire()" type="primary"
		>模拟过期</AsamButton
	><AsamButton @click="security.logout()" type="primary">登出</AsamButton>
</template>
<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { createSecurity } from '@asam-ui/pro/application/security';
import { createFixture } from './Fixture.js';
const fixture = createFixture();
const security = createSecurity({ adapter: fixture.adapter });
const state = security.state;
onBeforeUnmount(() => security.dispose());
</script>
