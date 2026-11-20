import { onScopeDispose } from 'vue';
import { useAsamProI18n } from '@asam-ui/pro/i18n';
import { createPreferences } from '@asam-ui/pro/application/preferences';
/** Host example text; fixture subject names, roles and context labels are business data. */
const dictionaries = {
	'zh-CN': {
		title: '安全应用示例',
		size: '尺寸',
		dark: '暗色',
		failAuth: '模拟认证失败',
		failRead: '模拟读取失败',
		session: '会话',
		roles: '角色',
		none: '无',
		expires: '有效期',
		identity: '本地示例身份',
		login: '登录 / 替换身份',
		restore: '恢复会话',
		refresh: '刷新会话',
		expire: '模拟过期',
		logout: '登出',
		context: '租户 / 组织',
		workspace: '直接访问工作台',
		audit: '直接访问审计',
		back: '后退',
		safeTitle: '安全页',
		safe: '请登录或重试恢复；受限内容已清除。',
		choose: '请选择菜单',
		data: '范围数据',
		loading: '读取中',
		ready: '当前范围资料',
		select: '选择记录',
		draft: '敏感草稿',
		save: '保存记录',
		retry: '重试读取',
		readFailed: '资料读取失败，请重试',
		denied: '操作已拒绝',
		saved: '本地示例保存完成（真实写入由后端再次鉴权）'
	},
	en: {
		title: 'Security application example',
		size: 'Size',
		dark: 'Dark mode',
		failAuth: 'Simulate authentication failure',
		failRead: 'Simulate read failure',
		session: 'Session',
		roles: 'Roles',
		none: 'None',
		expires: 'Expires',
		identity: 'Local example identity',
		login: 'Sign in / replace identity',
		restore: 'Restore session',
		refresh: 'Refresh session',
		expire: 'Simulate expiry',
		logout: 'Sign out',
		context: 'Tenant / organization',
		workspace: 'Open workspace directly',
		audit: 'Open audit directly',
		back: 'Back',
		safeTitle: 'Safe page',
		safe: 'Sign in or retry restoration. Restricted content has been cleared.',
		choose: 'Choose a menu item',
		data: 'Scoped data',
		loading: 'Reading',
		ready: 'Current scope data',
		select: 'Select record',
		draft: 'Sensitive draft',
		save: 'Save record',
		retry: 'Retry reading',
		readFailed: 'Unable to read data. Retry.',
		denied: 'Operation denied',
		saved: 'Local example saved. The backend must authorize real writes again.'
	}
};
export function useExampleText() {
	const scope = useAsamProI18n();
	const preferences = createPreferences({
		app: 'security-example-text',
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
