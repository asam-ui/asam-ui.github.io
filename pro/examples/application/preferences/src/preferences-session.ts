import { computed, onScopeDispose, shallowRef } from 'vue';
import {
	browserStorage,
	createPreferences,
	memoryStorage
} from '@asam-ui/pro/application/preferences';
import type { Preferences, StorageAdapter } from '@asam-ui/pro/application/preferences';

type Mode = 'browser' | 'memory' | 'unavailable';

/** 每个演示拥有稳定 owner；内存适配器在重建 controller 时保留，刷新后自然丢失。 */
export function usePreferenceSession(scopeId: string) {
	const mode = shallowRef<Mode>('browser');
	const feedback = shallowRef('尚未修改偏好。');
	const memory = memoryStorage();
	const unavailable: StorageAdapter = {
		getItem() {
			throw Error('演示适配器拒绝读取');
		},
		setItem() {
			throw Error('演示适配器拒绝写入');
		},
		removeItem() {
			throw Error('演示适配器拒绝删除');
		}
	};
	const create = () =>
		createPreferences({
			app: 'asam-website-inline-preferences-v1',
			owner: [scopeId, mode.value],
			storage:
				mode.value === 'memory'
					? memory
					: mode.value === 'unavailable'
						? unavailable
						: browserStorage(),
			dictionaries: {
				'zh-CN': { hello: '你好，偏好由本示例独立管理。' },
				en: { hello: 'Hello, this example owns its preferences.' }
			},
			fallbackLocale: 'zh-CN',
			initial: { locale: 'zh-CN', theme: 'light' }
		});
	const current = shallowRef(create());
	const recreate = () => {
		current.value.dispose();
		current.value = create();
		feedback.value = `已释放并重建，读取结果：${current.value.status.value}。`;
	};
	onScopeDispose(() => current.value.dispose());
	return {
		mode,
		feedback,
		locale: computed(() => current.value.locale.value),
		theme: computed(() => current.value.theme.value),
		colorMode: computed(() => current.value.colorMode.value),
		status: computed(() => current.value.status.value),
		message: computed(() => current.value.t('hello')),
		choose(value: Partial<Preferences>) {
			const accepted = current.value.choose(value);
			feedback.value = !accepted
				? '偏好未被接受。'
				: current.value.status.value === 'ok'
					? '偏好已接受并保存到当前存储。'
					: `偏好已在本地接受，未保存：${current.value.status.value}。`;
		},
		setMode(value: Mode) {
			mode.value = value;
			recreate();
		},
		recreate,
		reset() {
			current.value.reset();
			feedback.value = `仅清除当前示例的存储键，结果：${current.value.status.value}。`;
		}
	};
}
