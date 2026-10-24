export type Appearance = 'bright' | 'dim'

export const APPEARANCE_KEY = 'ness-appearance'
export const APPEARANCE_EVENT = 'ness-appearance'

export function readAppearance(): Appearance {
  try {
    return localStorage.getItem(APPEARANCE_KEY) === 'bright' ? 'bright' : 'dim'
  } catch {
    return 'dim'
  }
}

export function applyAppearance(value: Appearance) {
  document.documentElement.dataset.appearance = value
  try {
    localStorage.setItem(APPEARANCE_KEY, value)
  } catch {
    // Storage can be blocked. The choice still applies for this page view.
  }
  window.dispatchEvent(new CustomEvent(APPEARANCE_EVENT, { detail: value }))
}
