import { getSettings, watchSettings, type ThemeChoice } from './settings'

export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

export function initTheme(): () => void {
  void getSettings().then((s) => applyTheme(s.theme))
  return watchSettings((s) => applyTheme(s.theme))
}
