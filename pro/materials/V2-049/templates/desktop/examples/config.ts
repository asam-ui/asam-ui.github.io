import type { DesktopPanel } from '../Types.js';
export const desktopConfig = {
	title: '协作桌面',
	description: '三个本地示例面板，布局与业务内容分别管理。',
	app: 'asam-desktop-example',
	scope: ['workspace'] as const
};
export const panels: readonly DesktopPanel[] = [
	{
		id: 'overview',
		title: '工作概览',
		description: '今天的工作安排',
		allowed: true,
		initialOpen: true,
		initial: { x: 24, y: 24, width: 440, height: 330 }
	},
	{
		id: 'notes',
		title: '临时笔记',
		description: '草稿只留在当前面板实例',
		allowed: true,
		initialOpen: true,
		initial: { x: 290, y: 110, width: 420, height: 320 }
	},
	{
		id: 'activity',
		title: '协作动态',
		description: '由宿主加载，可替换为自己的资源',
		allowed: true,
		initialOpen: true,
		initial: { x: 540, y: 210, width: 400, height: 290 }
	}
];
