<template>
	<main class="login-template login-minimal">
		<header>
			<div class="login-wordmark">
				{{ brandTitle }}<span>{{ i18n.t('app.templates.account.wordmark') }}</span>
			</div>
		</header>
		<aside class="login-aside">
			<p>{{ i18n.t('app.templates.account.minimalNote') }}</p>
			<span>{{ i18n.t('app.templates.account.minimalContinue') }}</span>
		</aside>

		<section class="login-content" :data-login-state="state" :aria-label="title">
			<p class="login-location">{{ i18n.t('app.templates.account.entry') }}</p>
			<h1>{{ title }}</h1>
			<p class="login-description">{{ description }}</p>
			<AsamBaseForm
				class="login-form"
				novalidate
				:aria-busy="pending"
				@submit.prevent="submitFromForm"
				@keydown.enter="enter"
			>
				<div class="login-field">
					<label :for="id + '-account'">{{ accountLabel }}</label>
					<AsamInput
						ref="accountInput"
						:id="id + '-account'"
						:model-value="draft.username"
						@update:model-value="
							(value) => {
								draft.username = String(value);
							}
						"
						name="username"
						autocomplete="username"
						:size="size"
						:disabled="inputLocked"
						:readonly="readonly"
						v-bind="{
							'aria-invalid': !!(fieldErrors.account || undefined) || undefined,
							'aria-describedby': fieldErrors.account
								? id + '-account-error'
								: undefined
						}"
					/>
					<p
						v-if="fieldErrors.account"
						:id="id + '-account-error'"
						class="login-error"
						role="alert"
					>
						{{ i18n.t('app.templates.account.requiredAccount') }}
					</p>
				</div>
				<div class="login-field">
					<label :for="id + '-password'">{{
						i18n.t('app.templates.account.password')
					}}</label>
					<AsamPassword
						ref="passwordInput"
						:id="id + '-password'"
						:model-value="draft.password"
						@update:model-value="
							(value) => {
								draft.password = String(value);
							}
						"
						name="password"
						autocomplete="current-password"
						:size="size"
						:disabled="inputLocked"
						:readonly="readonly"
						v-bind="{
							'aria-invalid': !!(fieldErrors.password || undefined) || undefined,
							'aria-describedby': fieldErrors.password
								? id + '-password-error'
								: undefined
						}"
					/>
					<p
						v-if="fieldErrors.password"
						:id="id + '-password-error'"
						class="login-error"
						role="alert"
					>
						{{ i18n.t('app.templates.account.requiredPassword') }}
					</p>
				</div>
				<p v-if="message" class="login-error" role="alert">{{ message }}</p>
				<p v-if="state === 'success'" role="status">
					{{ i18n.t('pro.form.loginSuccess') }}
				</p>
				<AsamButton
					class="login-submit"
					type="primary"
					native-type="submit"
					:size="size"
					:loading="pending"
					:disabled="locked"
					>{{ i18n.t(pending ? 'pro.form.loginPending' : 'pro.form.login') }}</AsamButton
				>
			</AsamBaseForm>
			<div v-if="showRegistration" class="login-alternate">
				<span>{{ i18n.t('app.templates.account.noAccount') }}</span>
				<AsamButton
					native-type="button"
					:size="size"
					:disabled="disabled || readonly || pending"
					@click="$emit('page', 'register')"
					>{{ i18n.t('app.templates.account.create') }}</AsamButton
				>
			</div>
		</section>
	</main>
</template>
<script lang="ts">
import { AsamBaseForm } from '@asam-ui/ui';
import type {} from '@asam-ui/ui/i18n';
/** Local message declarations travel with this single SFC. */
declare module '@asam-ui/ui/i18n' {
	interface AsamI18nMessageParameters {
		'app.templates.account.account': Record<never, never>;
		'app.templates.account.brandDescription': Record<never, never>;
		'app.templates.account.brandIntro': Record<never, never>;
		'app.templates.account.brandLogin': Record<never, never>;
		'app.templates.account.brandNote': Record<never, never>;
		'app.templates.account.create': Record<never, never>;
		'app.templates.account.entry': Record<never, never>;
		'app.templates.account.loginFailed': Record<never, never>;
		'app.templates.account.loginRejected': Record<never, never>;
		'app.templates.account.minimalContinue': Record<never, never>;
		'app.templates.account.minimalIntro': Record<never, never>;
		'app.templates.account.minimalLogin': Record<never, never>;
		'app.templates.account.minimalNote': Record<never, never>;
		'app.templates.account.navigationFailed': Record<never, never>;
		'app.templates.account.noAccount': Record<never, never>;
		'app.templates.account.password': Record<never, never>;
		'app.templates.account.requiredAccount': Record<never, never>;
		'app.templates.account.requiredPassword': Record<never, never>;
		'app.templates.account.returnDenied': Record<never, never>;
		'app.templates.account.techDescription': Record<never, never>;
		'app.templates.account.techIntro': Record<never, never>;
		'app.templates.account.techLogin': Record<never, never>;
		'app.templates.account.techNote': Record<never, never>;
		'app.templates.account.wordmark': Record<never, never>;
	}
}

import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
import { AsamButton, AsamInput, AsamPassword } from '@asam-ui/ui';
import { useAsamProI18n } from '@asam-ui/pro/i18n';
import type { AsamControlSize } from '@asam-ui/ui';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
export default defineComponent({
	name: 'MinimalAccountLogin',
	inheritAttrs: false,
	components: { AsamBaseForm, AsamInput, AsamPassword, AsamButton },
	props: {
		authenticate: {
			type: Function as PropType<
				(
					credentials: { username: string; password: string },
					context: { signal: AbortSignal }
				) => Promise<void>
			>,
			required: true
		},
		brandTitle: { type: String, default: 'ASAM基础开发平台' },
		heading: String,
		supportText: String,
		initialUsername: { type: String, default: '' },
		size: { type: String as PropType<AsamControlSize>, default: 'default' },
		disabled: Boolean,
		readonly: Boolean,
		showRegistration: { type: Boolean, default: true },
		formatError: Function as PropType<(error: unknown) => string>
	},
	emits: {
		page: (_page: 'login' | 'register' | 'profile' | 'settings') => true,
		completed: (_kind: 'login' | 'register' | 'save') => true,
		success: () => true,
		pending: (_value: boolean) => true
	},
	setup(props, { emit, expose }) {
		const i18n = useAsamProI18n({
			en: {
				'app.templates.account.minimalIntro':
					'Use your account to continue your work today.',
				'app.templates.account.account': 'Account',
				'app.templates.account.password': 'Password',
				'app.templates.account.create': 'Create account',
				'app.templates.account.noAccount': 'Do not have an account?',
				'app.templates.account.entry': 'Account entry',
				'app.templates.account.minimalNote':
					'Make room to focus on what is in front of you.',
				'app.templates.account.minimalContinue': 'Continue your work here.',
				'app.templates.account.brandNote': 'Bring ideas into everyday life.',
				'app.templates.account.brandIntro':
					'Connect your work and team with a clear starting point for every collaboration.',
				'app.templates.account.techNote': 'Connect with focus. Work with confidence.',
				'app.templates.account.techIntro':
					'One account to continue your application workspace.',
				'app.templates.account.minimalLogin': 'Welcome back',
				'app.templates.account.brandLogin': 'Return to your workspace',
				'app.templates.account.brandDescription':
					'Your next team collaboration starts here.',
				'app.templates.account.techLogin': 'Connect to your workspace',
				'app.templates.account.techDescription':
					'Verify your account to continue your application session.',
				'app.templates.account.requiredAccount': 'Enter your account',
				'app.templates.account.requiredPassword': 'Enter your password',
				'app.templates.account.loginRejected':
					'Login did not complete. Check your account and retry.',
				'app.templates.account.loginFailed': 'Login did not complete. Please retry.',
				'app.templates.account.returnDenied':
					'The application does not allow this return path.',
				'app.templates.account.navigationFailed':
					'Login completed, but navigation failed. Use the application navigation.',
				'app.templates.account.wordmark': 'ACCOUNT'
			},
			'zh-CN': {
				'app.templates.account.minimalIntro': '使用你的账户，继续今天的工作。',
				'app.templates.account.account': '账户',
				'app.templates.account.password': '密码',
				'app.templates.account.create': '创建账户',
				'app.templates.account.noAccount': '还没有账户？',
				'app.templates.account.entry': '账户入口',
				'app.templates.account.minimalNote': '留一点空间，专注眼前的事。',
				'app.templates.account.minimalContinue': '你的工作，从这里继续。',
				'app.templates.account.brandNote': '把想法带进日常。',
				'app.templates.account.brandIntro':
					'连接你的工作与团队，让每一次协作都有清晰的起点。',
				'app.templates.account.techNote': '专注连接，从容掌控。',
				'app.templates.account.techIntro': '一个账户，继续你的应用工作区。',
				'app.templates.account.minimalLogin': '欢迎回来',
				'app.templates.account.brandLogin': '回到你的工作空间',
				'app.templates.account.brandDescription': '与团队的下一次协作，从这里开始。',
				'app.templates.account.techLogin': '连接工作空间',
				'app.templates.account.techDescription': '验证账户后，继续你的应用会话。',
				'app.templates.account.requiredAccount': '请填写账户',
				'app.templates.account.requiredPassword': '请填写密码',
				'app.templates.account.loginRejected': '登录未能完成，请检查账户后重试',
				'app.templates.account.loginFailed': '登录未能完成，请重试',
				'app.templates.account.returnDenied': '应用未允许此返回路径',
				'app.templates.account.navigationFailed':
					'登录已完成，页面跳转失败，请使用应用导航',
				'app.templates.account.wordmark': '账户'
			}
		});
		const id = useId();
		const draft = reactive({ username: props.initialUsername, password: '' });
		const accountInput = ref<InstanceType<typeof AsamInput>>();
		const passwordInput = ref<InstanceType<typeof AsamPassword>>();
		const state = ref<'idle' | 'pending' | 'failure' | 'success'>('idle');
		const pending = computed(() => state.value === 'pending');
		const locked = computed(
			() => !!props.disabled || !!props.readonly || pending.value || state.value === 'success'
		);
		const inputLocked = computed(
			() => !!props.disabled || pending.value || state.value === 'success'
		);
		const fieldErrors = reactive({ account: false, password: false });
		const messageKey = ref<'' | 'app.templates.account.loginFailed'>('');
		const safeError = ref('');
		const title = computed(() => props.heading ?? i18n.t('app.templates.account.minimalLogin'));
		const description = computed(
			() => props.supportText ?? i18n.t('app.templates.account.minimalIntro')
		);
		const accountLabel = computed(() => i18n.t('app.templates.account.account'));
		const message = computed(
			() => safeError.value || (messageKey.value ? i18n.t(messageKey.value) : '')
		);
		let revision = 0;
		let disposed = false;
		let requestAbort: AbortController | undefined;
		function setState(value: typeof state.value) {
			const wasPending = pending.value;
			state.value = value;
			if (wasPending !== pending.value) emit('pending', pending.value);
		}
		/** Only cancels this template; the injected host retains session/logout APIs. */
		function cancel() {
			++revision;
			requestAbort?.abort();
			requestAbort = undefined;
			draft.password = '';
			messageKey.value = '';
			safeError.value = '';
			fieldErrors.account = false;
			fieldErrors.password = false;
			setState('idle');
		}
		function reset() {
			cancel();
			draft.username = props.initialUsername;
		}
		function clear() {
			cancel();
			draft.username = '';
		}
		async function submit() {
			if (locked.value || disposed) return false;
			messageKey.value = '';
			safeError.value = '';
			fieldErrors.account = !draft.username.trim();
			fieldErrors.password = !draft.password;
			if (fieldErrors.account || fieldErrors.password) {
				await nextTick();
				if (!disposed) {
					if (fieldErrors.account) accountInput.value?.focus();
					else if (fieldErrors.password) passwordInput.value?.focus();
				}
				return false;
			}
			const token = ++revision;
			const controller = new AbortController();
			requestAbort = controller;
			const authenticate = props.authenticate;
			const current = () =>
				!disposed &&
				token === revision &&
				!controller.signal.aborted &&
				authenticate === props.authenticate &&
				!props.disabled &&
				!props.readonly;
			const credentials = { username: draft.username.trim(), password: draft.password };
			setState('pending');
			try {
				await authenticate(credentials, { signal: controller.signal });
				if (!current()) return false;
				draft.password = '';
				setState('success');
				emit('success');
				if (current()) emit('completed', 'login');
				return true;
			} catch (error) {
				if (!current()) return false;
				let display = '';
				try {
					display = props.formatError?.(error) ?? '';
				} catch {
					display = '';
				}
				safeError.value = typeof display === 'string' ? display.slice(0, 500) : '';
				messageKey.value = 'app.templates.account.loginFailed';
				setState('failure');
				return false;
			} finally {
				credentials.password = '';
				if (token === revision) {
					draft.password = '';
					requestAbort = undefined;
					if (pending.value) setState('idle');
				}
			}
		}
		function submitFromForm() {
			void submit();
		}
		function enter(event: KeyboardEvent) {
			if (event.isComposing || event.keyCode === 229) event.preventDefault();
		}
		watch(
			() => [props.disabled, props.readonly, props.authenticate, props.initialUsername],
			reset,
			{
				flush: 'sync'
			}
		);
		onBeforeUnmount(() => {
			disposed = true;
			cancel();
		});
		expose({ clear, reset, cancel, submit });

		return {
			clear,
			reset,
			cancel,
			submit,
			i18n,
			id,
			draft,
			accountInput,
			passwordInput,
			state,
			pending,
			locked,
			inputLocked,
			fieldErrors,
			title,
			description,
			accountLabel,
			message,
			submitFromForm,
			enter
		};
	}
});
</script>
<style scoped>
.login-template {
	--login-canvas: var(--asam-color-surface-page, #fff);
	--login-surface: var(--asam-color-surface, #fff);
	--login-ink: var(--asam-color-text-primary, #242933);
	--login-muted: color-mix(in srgb, var(--login-ink) 80%, var(--login-canvas));
	--login-error: var(--asam-semantic-danger-foreground);
	--login-line: var(--asam-color-border, #d5dbe2);
	--login-accent: var(--asam-semantic-primary-foreground);
	box-sizing: border-box;
	min-height: 100dvh;
	padding: 40px max(32px, calc((100% - 1184px) / 2));
	display: grid;
	grid-template-rows: auto 1fr;
	gap: 32px;
	background: var(--login-canvas);
	color: var(--login-ink);
	font-family: 'Segoe UI', 'Microsoft YaHei', system-ui, sans-serif;
}
.login-template *,
.login-template *::before,
.login-template *::after {
	box-sizing: border-box;
}
.login-wordmark {
	display: inline-flex;
	max-width: 100%;
	flex-wrap: wrap;
	overflow-wrap: anywhere;
	gap: 16px;
	align-items: center;
	font-size: 27px;
	font-weight: 750;
	letter-spacing: -0.055em;
	color: var(--login-accent);
}
.login-wordmark span {
	border-left: 1px solid var(--login-line);
	padding-left: 16px;
	color: var(--login-muted);
	font-size: 10px;
	font-weight: 500;
	letter-spacing: 0.18em;
}
.login-content {
	width: 100%;
	min-width: 0;
	align-self: center;
}
.login-location {
	margin: 0 0 18px;
	color: var(--login-muted);
	font-size: 12px;
}
h1 {
	margin: 0 0 12px;
	font-size: clamp(28px, 3vw, 38px);
	line-height: 1.2;
	font-weight: 650;
	letter-spacing: -0.035em;
	overflow-wrap: anywhere;
}
p {
	line-height: 1.65;
}
.login-description {
	margin: 0 0 28px;
	font-size: 14px;
	color: var(--login-muted);
}
.login-form {
	display: grid;
	gap: 22px;
	width: 100%;
	min-width: 0;
}
.login-field {
	display: grid;
	gap: 8px;
	min-width: 0;
}
.login-field label {
	font-size: 14px;
	line-height: 1.5;
}
.login-field :deep(.el-input) {
	width: 100%;
}
.login-submit {
	width: 100%;
	min-width: 0;
	margin: 6px 0 0;
}
.login-form p {
	margin: 0;
}
.login-error {
	color: var(--login-error);
	overflow-wrap: anywhere;
	font-size: 14px;
}
.login-alternate {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: center;
	border-top: 1px solid var(--login-line);
	padding-top: 20px;
	margin-top: 24px;
	font-size: 14px;
	color: var(--login-muted);
}
.login-alternate :deep(.el-button) {
	margin: 0;
}
.login-submit:focus-visible,
.login-alternate :deep(button:focus-visible) {
	outline: 2px solid var(--login-accent);
	outline-offset: 3px;
}
@media (max-width: 767px) {
	.login-template {
		display: flex;
		flex-direction: column;
		padding: 24px 20px;
		gap: 28px;
	}
	.login-content {
		flex: 1;
		width: 100%;
		padding-block: 20px;
	}
	h1 {
		font-size: 30px;
	}
}

.login-minimal {
	grid-template-columns: 1fr minmax(300px, 440px) 1fr;
	column-gap: 40px;
}
header {
	grid-column: 1 / -1;
}
.login-content {
	grid-column: 2;
	grid-row: 2;
	padding-block: 30px;
}
h1 {
	font-family: 'Palatino Linotype', 'Songti SC', serif;
	font-weight: 500;
	font-size: 38px;
}
.login-aside {
	grid-column: 3;
	grid-row: 2;
	align-self: center;
	padding-left: 24px;
	color: var(--login-muted);
	font-size: 13px;
}
.login-aside::before {
	content: '';
	display: block;
	height: 1px;
	width: 48px;
	background: var(--login-line);
	margin-bottom: 28px;
}
.login-aside p {
	font-size: 20px;
	color: var(--login-ink);
	white-space: pre-line;
}
@media (max-width: 767px) {
	.login-aside {
		display: none;
	}
	h1 {
		font-size: 30px;
	}
}
</style>
