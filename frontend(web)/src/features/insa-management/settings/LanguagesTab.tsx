import { fetchLanguages, saveLanguages } from '@/api/mockSettings'
import DataTable, { type Column } from '@/components/DataTable'
import type { LanguageCode, LanguageSetting } from '@/types/settings'
import SettingsSaveBar from './SettingsSaveBar'
import { useEditableSetting } from './useEditableSetting'

export default function LanguagesTab() {
  const setting = useEditableSetting(fetchLanguages, saveLanguages)
  const draft = setting.draft

  if (!draft) return <p className="text-slate-500">Loading...</p>

  function setEnabled(code: LanguageCode, enabled: boolean) {
    setting.update(draft!.map((l) => (l.code === code ? { ...l, enabled } : l)))
  }

  function makeDefault(code: LanguageCode) {
    setting.update(draft!.map((l) => ({ ...l, isDefault: l.code === code })))
  }

  const columns: Column<LanguageSetting>[] = [
    { header: 'Language', cell: (l) => l.name },
    {
      header: 'Written as',
      cell: (l) => <span lang={l.code}>{l.nativeName}</span>,
    },
    {
      header: 'Enabled',
      cell: (l) => (
        <input
          type="checkbox"
          aria-label={`Enable ${l.name}`}
          checked={l.enabled}
          // The default language cannot be turned off. Pick another default first.
          disabled={l.isDefault}
          onChange={(e) => setEnabled(l.code, e.target.checked)}
        />
      ),
    },
    {
      header: 'Default',
      cell: (l) => (
        <input
          type="radio"
          name="default-language"
          aria-label={`Make ${l.name} the default`}
          checked={l.isDefault}
          disabled={!l.enabled}
          onChange={() => makeDefault(l.code)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Choose the languages that alerts and apps can use. The default language
        is used when a person has not chosen one.
      </p>
      <DataTable columns={columns} rows={draft} getRowId={(l) => l.code} />
      <SettingsSaveBar
        dirty={setting.dirty}
        busy={setting.busy}
        error={setting.error}
        notice={setting.notice}
        onSave={() => void setting.submit()}
        onDiscard={setting.discard}
      />
    </div>
  )
}