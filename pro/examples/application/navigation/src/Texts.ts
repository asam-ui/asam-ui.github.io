import { onScopeDispose } from 'vue';
import { useAsamProI18n } from '@asam-ui/pro/i18n';
import { createPreferences } from '@asam-ui/pro/application/preferences';

/** Host example dictionary. Menu names and user data remain explicit fixture business values. */
const dictionaries = {
	'zh-CN': {
		dark: '暗色',
		size: '尺寸',
		allowLeave: '允许离开',
		people2: '人员 2',
		people3: '人员 3',
		removePeople: '移除人员菜单',
		rename: '修改菜单标题',
		embed: '嵌入页面',
		back: '后退',
		forward: '前进',
		home: '首页',
		draft: '本页草稿',
		line: '可修改页面内容',
		scroll: '滚动位置',
		page: '应用页面',
		safe: '页面已关闭，请选择菜单',
		unmatched: '未匹配页面，可通过菜单恢复'
	},
	en: {
		dark: 'Dark mode',
		size: 'Size',
		allowLeave: 'Allow leaving',
		people2: 'Person 2',
		people3: 'Person 3',
		removePeople: 'Remove people menu',
		rename: 'Change menu titles',
		embed: 'Embedded page',
		back: 'Back',
		forward: 'Forward',
		home: 'Home',
		draft: 'Page draft',
		line: 'Editable page content',
		scroll: 'Scroll position',
		page: 'Application page',
		safe: 'The page is closed. Choose a menu item.',
		unmatched: 'No matching page. Use the menu to recover.'
	}
};
export function useExampleText() {
	const scope = useAsamProI18n();
	const preferences = createPreferences({
		app: 'navigation-example-text',
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
