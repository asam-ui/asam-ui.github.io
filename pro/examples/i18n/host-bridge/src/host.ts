import { ref } from 'vue';
// 演示宿主字典；业务翻译仍归宿主。现有框架可直接提供它的 locale ref。
const dictionaries = { 'zh-CN': { people: '成员资料' }, en: { people: 'People records' } };
export function createHostLanguage() {
	const locale = ref<'zh-CN' | 'en'>('en');
	return { locale, title: () => dictionaries[locale.value].people };
}
