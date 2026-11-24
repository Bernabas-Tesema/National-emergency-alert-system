import { useEffect, useState } from 'react'
import {
  fetchGateways,
  moveGateway,
  replaceGatewayCredential,
  setGatewayEnabled,
} from '@/api/mockGateways'
import DataTable, { type Column } from '@/components/DataTable'
import StepUpDialog from '@/components/StepUpDialog'
import { Button } from '@/components/ui/button'
import { GATEWAY_CHANNEL_LABELS, type Gateway } from '@/types/settings'
import { messageFrom, type PendingStep } from './helpers'
import Messages from './Messages'
import OnOffBadge from './OnOffBadge'
import ReplaceKeyDialog from './ReplaceKeyDialog'

export default function GatewaysTab() {
  const [gateways, setGateways] = useState<Gateway[] | null>(null)
  const [replacing, setReplacing] = useState<Gateway | null>(null)
  const [pending, setPending] = useState<PendingStep | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchGateways().then((list) => {
      if (!cancelled) setGateways(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!gateways) return <p className="text-slate-500">Loading...</p>

  // Runs an action and replaces the list with the server's answer.
  async function apply(action: () => Promise<Gateway[]>, success: string) {
    try {
      setGateways(await action())
      setNotice(success)
    } catch (err) {
      setError(messageFrom(err))
    }
  }

  function askStepUp(step: PendingStep) {
    setNotice('')
    setError('')
    setPending(step)
  }

  function requestToggle(gateway: Gateway) {
    const next = !gateway.enabled
    askStepUp({
      title: `${next ? 'Turn on' : 'Turn off'} ${gateway.name}`,
      description: next
        ? 'Alerts can be sent through it again. Enter your verification code to confirm.'
        : 'Alerts will no longer be sent through it. Enter your verification code to confirm.',
      confirmLabel: next ? 'Turn on' : 'Turn off',
      run: () =>
        apply(
          () => setGatewayEnabled(gateway.id, next),
          `${gateway.name} was turned ${next ? 'on' : 'off'}.`,
        ),
    })
  }

  function requestMove(gateway: Gateway, direction: 'up' | 'down') {
    askStepUp({
      title: `Move ${gateway.name} ${direction === 'up' ? 'up' : 'down'}`,
      description:
        'This changes which gateway is tried first. Enter your verification code to confirm.',
      confirmLabel: 'Move',
      run: () =>
        apply(
          () => moveGateway(gateway.id, direction),
          `${gateway.name} was moved ${direction}.`,
        ),
    })
  }

  async function handleReplace(credential: string) {
    // Errors are left to the dialog, which shows its own message.
    if (!replacing) return
    const list = await replaceGatewayCredential(replacing.id, credential)
    setGateways(list)
    setNotice(`The key for ${replacing.name} was replaced.`)
    setError('')
    setReplacing(null)
  }

  const columns: Column<Gateway>[] = [
    { header: 'Name', cell: (g) => g.name },
    { header: 'Channel', cell: (g) => GATEWAY_CHANNEL_LABELS[g.channel] },
    {
      header: 'Order',
      cell: (g) => (g.priority === 1 ? 'Primary' : `Backup ${g.priority - 1}`),
    },
    { header: 'Status', cell: (g) => <OnOffBadge on={g.enabled} /> },
    {
      header: 'Key',
      cell: (g) => (
        <span className="text-sm text-slate-600">
          Set, replaced {g.credentialUpdatedAt}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (g) => {
        const sameChannel = gateways.filter((x) => x.channel === g.channel)
        const last = Math.max(...sameChannel.map((x) => x.priority))
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={g.priority === 1}
              aria-label={`Move ${g.name} up`}
              onClick={() => requestMove(g, 'up')}
            >
              Up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={g.priority === last}
              aria-label={`Move ${g.name} down`}
              onClick={() => requestMove(g, 'down')}
            >
              Down
            </Button>
            <Button variant="outline" size="sm" onClick={() => requestToggle(g)}>
              {g.enabled ? 'Turn off' : 'Turn on'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReplacing(g)}>
              Replace key
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        The providers that deliver SMS and voice alerts. If the primary gateway
        fails, the next one is tried. Every change needs a verification code, and
        keys can be replaced but never viewed. Each channel must keep at least
        one gateway on.
      </p>

      <Messages notice={notice} error={error} />

      <DataTable columns={columns} rows={gateways} getRowId={(g) => g.id} />

      {replacing && (
        <ReplaceKeyDialog
          gatewayName={replacing.name}
          onSubmit={handleReplace}
          onCancel={() => setReplacing(null)}
        />
      )}

      {pending && (
        <StepUpDialog
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          onCancel={() => setPending(null)}
          onVerified={async () => {
            const step = pending
            setPending(null)
            await step.run()
          }}
        />
      )}
    </div>
  )
}