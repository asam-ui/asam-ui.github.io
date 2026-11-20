import assert from 'node:assert/strict';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { AsamApplicationProvider } from '@asam-ui/pro/components';
import { createAsamProI18n, useAsamProI18n } from '@asam-ui/pro/i18n';
async function renderRequest(locale) {
	const scope = createAsamProI18n({ locale });
	const Content = defineComponent({
		setup() {
			const inherited = useAsamProI18n();
			return () => h('p', inherited.t('pro.common.empty'));
		}
	});
	try {
		return await renderToString(
			createSSRApp({
				render: () =>
					h(AsamApplicationProvider, { config: { base: { i18n: scope } } }, () =>
						h(Content)
					)
			})
		);
	} finally {
		scope.dispose();
	}
}
const [chinese, english] = await Promise.all([renderRequest('zh-CN'), renderRequest('en')]);
assert.notEqual(chinese, english);
assert(chinese.includes('暂无内容'));
assert(english.includes('No content'));
console.log(JSON.stringify({ chinese, english, isolatedRequests: true }));
