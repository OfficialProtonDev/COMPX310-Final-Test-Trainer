// Which copy this is. The Claude-hosted copy can use Claude (marking, Ask) and saves files through the host;
// the public web copy (GitHub Pages) has no Claude, so it falls back to plain browser features:
// real downloads, the print dialog, and opening claude.ai in a new tab with a question filled in.
/* global __HOST__ */
export const HOST = typeof __HOST__ !== 'undefined' ? __HOST__ : 'claude';
export const IS_WEB = HOST === 'web';
