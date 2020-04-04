export const CACHE_SEC = 30;
export const CACHE_CONTROL = `public, max-age=${CACHE_SEC}, must-revalidate, s-maxage=${CACHE_SEC}, stale-while-revalidate`;
export const DISABLE_FILE_LISTING = false;
export const PROTECTED_FILES = [/\.swp$/];
export const HIDDEN_FILES = [/^\./, ...PROTECTED_FILES];
