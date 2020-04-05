export const CACHE_SEC = 30;
export const CACHE_CONTROL = `public, no-cache, max-age=0, stale-while-revalidate=${CACHE_SEC}, s-maxage=${CACHE_SEC}, no-transform`;
export const DISABLE_FILE_LISTING = false;
export const PROTECTED_FILES = [/\.swp$/];
export const HIDDEN_FILES = [/^\./, ...PROTECTED_FILES];
