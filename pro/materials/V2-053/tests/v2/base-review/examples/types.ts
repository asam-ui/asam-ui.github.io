import {
	AsamButton,
	AsamInput,
	AsamPassword,
	AsamTextarea,
	AsamBaseForm,
	AsamMessage,
	AsamLoading,
	AsamUpload,
	AsamTour,
	asamControlSizes,
	createAsamTheme
} from '@asam-ui/ui';
import type {
	AsamControlSize,
	AsamInputProps,
	AsamPasswordProps,
	AsamTextareaProps
} from '@asam-ui/ui';
import type { AsamApplicationConfig } from '@asam-ui/pro';
const sizes: readonly AsamControlSize[] = asamControlSizes;
const input: AsamInputProps = { size: 'big', type: 'email', modelValue: 'a@b.com' };
const password: AsamPasswordProps = { size: 'small', showPassword: true };
const textarea: AsamTextareaProps = { rows: 4, autosize: { minRows: 2, maxRows: 6 } };
const config: AsamApplicationConfig = {
	size: 'big',
	theme: null,
	base: { button: { plain: true } }
};
// @ts-expect-error 未定义的第五档尺寸不能静默回退为 EP 三档。
const wrongSize: AsamControlSize = 'mini';
// @ts-expect-error 密码能力已由 AsamPassword 承接。
const wrongInput: AsamInputProps = { type: 'password' };
// @ts-expect-error 多行能力已由 AsamTextarea 承接。
const wrongTextarea: AsamInputProps = { type: 'textarea' };
// @ts-expect-error variant 为已删除接口。
const oldButton: InstanceType<typeof AsamButton>['$props'] = { variant: 'primary' };
const theme = createAsamTheme({ color: { primary: '#7a315c' } });
const foregroundTheme = createAsamTheme({ color: { onSolid: '#f5e663' } });
// @ts-expect-error 实心前景是可选字符串，错误类型不能静默接受。
createAsamTheme({ color: { onSolid: 123 } });
const tourModel: InstanceType<typeof AsamTour>['$props']['modelValue'] = false;
const tourProps: InstanceType<typeof AsamTour>['$props'] = {
	modelValue: true,
	current: 0,
	showArrow: false,
	mask: false,
	closeOnPressEscape: true
};
const nativeUpload: InstanceType<typeof AsamUpload<'native'>>['$props'] = {
	mode: 'native',
	action: '/fixture-unused',
	autoUpload: false
};
// @ts-expect-error 原生模型是boolean。
const badTour: InstanceType<typeof AsamTour>['$props']['modelValue'] = 'visible';
void [
	sizes,
	input,
	password,
	textarea,
	config,
	wrongSize,
	wrongInput,
	wrongTextarea,
	oldButton,
	theme,
	foregroundTheme,
	tourModel,
	tourProps,
	nativeUpload,
	badTour,
	AsamInput,
	AsamPassword,
	AsamTextarea,
	AsamBaseForm,
	AsamMessage,
	AsamLoading
];
