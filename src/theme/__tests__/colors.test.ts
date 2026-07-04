import { resolveTheme } from '../colors';

describe('resolveTheme', () => {
  it('sigue al sistema cuando override es system', () => {
    expect(resolveTheme('light', 'system')).toBe('light');
    expect(resolveTheme('dark', 'system')).toBe('dark');
  });
  it('usa dark si el sistema no reporta', () => {
    expect(resolveTheme(null, 'system')).toBe('dark');
    expect(resolveTheme(undefined, 'system')).toBe('dark');
  });
  it('el override manual gana', () => {
    expect(resolveTheme('dark', 'light')).toBe('light');
    expect(resolveTheme('light', 'dark')).toBe('dark');
  });
});
