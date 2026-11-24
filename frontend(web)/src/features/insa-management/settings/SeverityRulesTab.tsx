import { useState } from 'react'
import { fetchSeverityRules, saveSeverityRules } from '@/api/mockSettings'
import DataTable, { type Column } from '@/components/DataTable'
import SeverityBadge from '@/components/SeverityBadge'
import StepUpDialog from '@/components/StepUpDialog'
import { CHANNEL_LABELS, SEVERITY_LABELS, type DeliveryChannel, type Severity } from '@/types/case'
import type { SeverityRule } from '@/types/settings'
import SettingsSaveBar from './SettingsSaveBar'
import { useEditableSetting } from './useEditableSetting'

const CHANNEL_ORDER: DeliveryChannel[] = ['PUSH', 'SMS', 'VOICE']

export default function SeverityRulesTab() {
  const setting = useEditableSetting(fetchSeverityRules, saveSeverityRules)
  const [confirming, setConfirming] = useState(false)
  const draft = setting.draft

  if (!draft) return <p className="text-slate-500">Loading...</p>

  const noChannel = draft.find((r) => r.channels.length === 0)
  const blocked = noChannel
    ? `${SEVERITY_LABELS[noChannel.severity]} needs at least one channel.`
    : undefined

  function changeRule(severity: Severity, change: (rule: SeverityRule) => SeverityRule) {
    setting.update(draft!.map((r) => (r.severity === severity ? change(r) : r)))
  }

  function setChannel(severity: Severity, channel: DeliveryChannel, on: boolean) {
    changeRule(severity, (rule) => ({
      ...rule,
      // Rebuilt in a fixed order so the list never depends on click order.
      channels: CHANNEL_ORDER.filter((c) =>
        c === channel ? on : rule.channels.includes(c),
      ),
    }))
  }

  const columns: Column<SeverityRule>[] = [
    { header: 'Severity', cell: (r) => <SeverityBadge severity={r.severity} /> },
    {
      header: 'Delivery channels',
      cell: (r) => (
        <div className="flex flex-wrap gap-4">
          {CHANNEL_ORDER.map((channel) => (
            <label key={channel} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={r.channels.includes(channel)}
                onChange={(e) => setChannel(r.severity, channel, e.target.checked)}
              />
              {CHANNEL_LABELS[channel]}
            </label>
          ))}
        </div>
      ),
    },
    {
      header: 'Fast-track',
      cell: (r) => {
        const allowed = r.severity === 'HIGH' || r.severity === 'CRITICAL'
        return (
          <input
            type="checkbox"
            aria-label={`Allow fast-track for ${SEVERITY_LABELS[r.severity]}`}
            checked={r.fastTrackAllowed}
            disabled={!allowed}
            onChange={(e) =>
              changeRule(r.severity, (rule) => ({
                ...rule,
                fastTrackAllowed: e.target.checked,
              }))
            }
          />
        )
      },
    },
    {
      header: 'Approval',
      cell: () => (
        <span className="text-sm text-slate-600">
          Administrator and higher officer (always)
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Decide which channels each severity level may use. Fast-track lets an
        urgent alert skip the normal queue, and is only available for high and
        critical alerts. Every public alert still needs both approvals.
      </p>
      <DataTable columns={columns} rows={draft} getRowId={(r) => r.severity} />
      <SettingsSaveBar
        dirty={setting.dirty}
        busy={setting.busy}
        blocked={blocked}
        error={setting.error}
        notice={setting.notice}
        onSave={() => setConfirming(true)}
        onDiscard={setting.discard}
      />
      {confirming && (
        <StepUpDialog
          title="Save severity rules"
          description="These rules decide how alerts are delivered. Enter your verification code to confirm."
          confirmLabel="Save rules"
          onCancel={() => setConfirming(false)}
          onVerified={async () => {
            setConfirming(false)
            await setting.submit()
          }}
        />
      )}
    </div>
  )
}