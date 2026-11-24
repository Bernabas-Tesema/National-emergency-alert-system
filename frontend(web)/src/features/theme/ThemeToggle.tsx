import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import {
  APPEARANCE_EVENT,
  applyAppearance,
  readAppearance,
  type Appearance,
} from './appearance'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)

  useEffect(() => {
    function sync(event: Event) {
      const detail = (event as CustomEvent<Appearance>).detail
      setAppearance(detail === 'bright' ? 'bright' : 'dim')
    }
    window.addEventListener(APPEARANCE_EVENT, sync)
    return () => window.removeEventListener(APPEARANCE_EVENT, sync)
  }, [])

  const bright = appearance === 'bright'

  function toggle() {
    const next: Appearance = bright ? 'dim' : 'bright'
    applyAppearance(next)
    setAppearance(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={bright}
      aria-label={bright ? 'Switch to dim' : 'Switch to bright'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
        bright
          ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
          : 'border-[#1b2e34] bg-[#111d21] text-slate-200 hover:border-teal-500/40 hover:text-teal-200'
      } ${className}`}
    >
      {bright ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      {bright ? 'Bright' : 'Dim'}
    </button>
  )
}
