// Stand-in identity until a real auth stack exists: sent as the X-Author header, which the
// engine records as the draft holder and publisher.
export const AUTHOR = 'ui-author@bracits.com'

// localStorage key remembering the last domain picked, so the domain prompt only shows the first time.
export const LAST_DOMAIN_STORAGE_KEY = 'query-builder-ui.lastDomain'
