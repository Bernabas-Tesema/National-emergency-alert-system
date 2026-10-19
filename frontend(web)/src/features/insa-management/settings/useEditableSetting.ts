import { useEffect, useState } from 'react'
import { SettingsError } from '@/api/mockSettings'

// Loads a setting once, lets the screen edit a local copy (the draft), and
// saves it on request. `load` must be a stable function (defined outside the
// component), or the effect would reload on every render.
export function useEditableSetting<T>(
  load: () => Promise<T>,
  save: (value: T) => Promise<T>,
) {
  const [saved, setSaved] = useState<T | null>(null)
  const [draft, setDraft] = useState<T | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    load().then((value) => {
      if (!cancelled) {
        setSaved(value)
        setDraft(value)
      }
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const dirty =
    saved !== null &&
    draft !== null &&
    JSON.stringify(saved) !== JSON.stringify(draft)

  function update(value: T) {
    setNotice('')
    setError('')
    setDraft(value)
  }

  function discard() {
    setNotice('')
    setError('')
    setDraft(saved)
  }

  async function submit() {
    if (draft === null) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await save(draft)
      setSaved(result)
      setDraft(result)
      setNotice('Changes saved.')
    } catch (err) {
      setError(
        err instanceof SettingsError
          ? err.message
          : 'Could not save the changes. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return { draft, dirty, busy, error, notice, update, discard, submit }
}