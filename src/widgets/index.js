import core from './reg-core.js';
import a from './reg-a.js';
import b from './reg-b.js';
import c from './reg-c.js';
import d from './reg-d.js';

export const WIDGETS = [...core, ...a, ...b, ...c, ...d].sort((x, y) => x.week - y.week);
export const WIDGET = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));
