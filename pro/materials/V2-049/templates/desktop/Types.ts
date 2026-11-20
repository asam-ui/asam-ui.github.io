import type { VNode } from 'vue';
import type { AsamControlSize } from '@asam-ui/ui';
import type { Scope, StorageAdapter, StorageStatus } from '../app/preferences/Types.js';
import type { DesktopController } from './Desktop.js';

export type DesktopFamily = 'minimal' | 'brand' | 'tech';
export type PanelStatus = 'ready' | 'loading' | 'empty' | 'error';
export interface WindowRect {
	x: number;
	y: number;
	width: number;
	height: number;
}
export interface DesktopPanel {
	id: string;
	title: string;
	description?: string;
	/** Current host authority; never restored from storage. */
	allowed: boolean;
	disabled?: boolean;
	readonly?: boolean;
	status?: PanelStatus;
	initial?: Partial<WindowRect>;
	initialOpen?: boolean;
}
export interface DesktopWindow {
	id: string;
	rect: WindowRect;
	minimized: boolean;
	maximized: boolean;
}
export interface LayoutSnapshot {
	version: 1;
	windows: DesktopWindow[];
	active: string | null;
}
export type LayoutStatus = StorageStatus | 'conflict';
export interface DesktopOptions {
	app: string;
	owner: Scope;
	scope: Scope;
	panels: readonly DesktopPanel[];
	storage?: StorageAdapter;
	ttl?: number;
	now?: () => number;
	/** A strictly smaller container is narrow; default 720 CSS px. */
	breakpoint?: number;
	disabled?: boolean;
	readonly?: boolean;
}
export interface DesktopPageProps {
	controller: DesktopController;
	title?: string;
	description?: string;
	size?: AsamControlSize;
}
export interface DesktopPanelScope {
	panel: Readonly<DesktopPanel>;
	window: Readonly<DesktopWindow>;
	readonly: boolean;
	close: () => boolean;
}
export interface DesktopSlots {
	panel?: (scope: DesktopPanelScope) => VNode[];
	navigation?: () => VNode[];
	footer?: () => VNode[];
}
export interface DesktopExpose {
	focus: () => void;
	cancel: () => void;
}
