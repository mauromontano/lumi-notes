// logger mínimo: solo emite en dev builds para no ensuciar producción
export const log = {
  debug(...args: unknown[]) {
    if (__DEV__) console.log('[lumi]', ...args);
  },
  warn(...args: unknown[]) {
    if (__DEV__) console.warn('[lumi]', ...args);
  },
  error(...args: unknown[]) {
    if (__DEV__) console.error('[lumi]', ...args);
  },
};
