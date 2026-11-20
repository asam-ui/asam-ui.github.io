import { onScopeDispose } from 'vue';
import type { AsamI18n } from '@asam-ui/ui/i18n';
import { useAsamProI18n } from '@asam-ui/pro/i18n';
import { createPreferences } from '@asam-ui/pro/application/preferences';
/** The example host owns these words and its mock option labels. */
const dictionaries = {
	'zh-CN': {
		title: '请求与错误联动',
		description: '本地模拟请求，认证与错误呈现由应用注入。',
		scenario: '场景',
		success: '正常',
		empty: '空数据',
		business: '业务失败',
		auth: '认证失效',
		network: '网络失败',
		unknown: '未知异常',
		load: '加载 / 恢复',
		rotate: '更新模拟认证',
		mount: '卸载 / 重挂组件',
		revisions: '认证更新次数',
		authTitle: '认证需要更新',
		failedTitle: '请求暂时无法完成',
		recover: '恢复正常请求',
		placeholder: '选择本地测试项目',
		selected: '当前选择',
		none: '未选择',
		feedback: '反馈次数'
	},
	en: {
		title: 'Requests and error feedback',
		description:
			'Local mock requests. The host supplies authentication and error presentation.',
		scenario: 'Scenario',
		success: 'Success',
		empty: 'Empty data',
		business: 'Business failure',
		auth: 'Authentication expired',
		network: 'Network failure',
		unknown: 'Unknown error',
		load: 'Load / recover',
		rotate: 'Update mock authentication',
		mount: 'Unmount / remount control',
		revisions: 'Authentication updates',
		authTitle: 'Authentication needs updating',
		failedTitle: 'The request is temporarily unavailable',
		recover: 'Restore successful requests',
		placeholder: 'Select a local test item',
		selected: 'Current selection',
		none: 'Not selected',
		feedback: 'Feedback count'
	}
};
export function useExampleText(explicit?: AsamI18n) {
	const scope = explicit ?? useAsamProI18n();
	const preferences = createPreferences({
		app: 'transport-example-text',
		owner: [],
		dictionaries,
		fallbackLocale: 'en',
		force: {
			get locale() {
				return scope.locale.value;
			}
		}
	});
	onScopeDispose(preferences.dispose);
	return { t: preferences.t, scope };
}
