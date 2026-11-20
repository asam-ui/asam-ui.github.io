import type { TourProps } from 'element-plus';

/** Fixed 2.14.7 public props; runtime defaults come from the installed component. */
/** Exact floating-ui Placement domain, named locally for portable SFC declarations. */
export type AsamTourPlacement =
	| 'top'
	| 'top-start'
	| 'top-end'
	| 'right'
	| 'right-start'
	| 'right-end'
	| 'bottom'
	| 'bottom-start'
	| 'bottom-end'
	| 'left'
	| 'left-start'
	| 'left-end';
export interface AsamTourProps {
	modelValue?: TourProps['modelValue'];
	current?: TourProps['current'];
	showArrow?: TourProps['showArrow'];
	showClose?: TourProps['showClose'];
	closeIcon?: TourProps['closeIcon'];
	placement?: AsamTourPlacement;
	contentStyle?: TourProps['contentStyle'];
	mask?: TourProps['mask'];
	gap?: TourProps['gap'];
	zIndex?: TourProps['zIndex'];
	scrollIntoViewOptions?: TourProps['scrollIntoViewOptions'];
	type?: TourProps['type'];
	appendTo?: TourProps['appendTo'];
	closeOnPressEscape?: TourProps['closeOnPressEscape'];
	targetAreaClickable?: TourProps['targetAreaClickable'];
}
export interface AsamTourEmits {
	'update:modelValue': [value: boolean];
	'update:current': [current: number];
	close: [current: number];
	finish: [];
	change: [current: number];
}
export interface AsamTourSlots {
	default?: () => unknown;
	indicators?: (props: { current: number; total: number }) => unknown;
}
