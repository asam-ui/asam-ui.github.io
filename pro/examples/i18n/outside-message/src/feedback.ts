import {
	createAsamMessageError,
	createAsamMessageIssue,
	formatFieldError,
	formatFieldIssue
} from '@asam-ui/pro/i18n';
import type { AsamI18n } from '@asam-ui/ui/i18n';
// 普通函数显式接收 scope；不在模块顶层使用注入 hook。
export function createFeedback(scope: AsamI18n) {
	const issue = createAsamMessageIssue('原始必填错误', 'ui.form.required', { label: '姓名' });
	const original = new Error('原始错误', { cause: new Error('保留的原因') });
	const error = createAsamMessageError(original, 'ui.form.required', { label: '姓名' });
	return {
		issue,
		error,
		original,
		issueText: () => formatFieldIssue(issue, scope),
		errorText: () => formatFieldError(error, scope)
	};
}
