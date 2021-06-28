import { INDEX_PATTERN, PROTECTED_FILES } from './config';
import { SiteConfig } from './get-site-config';

export function isIndexFile(name: string) {
	return INDEX_PATTERN.test(name) && PROTECTED_FILES.every((re) => !re.test(name.toLowerCase()));
}

export function shouldExec(siteConfig: SiteConfig, path: string): boolean {
	return !!siteConfig.functions && siteConfig.functionsPattern.test(path);
}
