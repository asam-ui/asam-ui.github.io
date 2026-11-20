import type { AsamI18n } from '@asam-ui/ui/i18n';
import { mountDemo } from './application.js';
export async function mountWebsiteExample(
	element: Element,
	onError: (error: unknown) => void,
	i18n?: AsamI18n
) {
	const result = await mountDemo(element, { i18n }, onError);
	return result;
}
