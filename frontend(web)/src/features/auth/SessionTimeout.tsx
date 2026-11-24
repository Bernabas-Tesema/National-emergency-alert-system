import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  rememberTimeoutSignOut,
} from '@/lib/session'
import { useAuth } from './useAuth'
import { useIdleTimeout } from './useIdleTimeout'

export default function SessionTimeout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function signOut(reason?: 'timeout') {
    if (reason === 'timeout') rememberTimeoutSignOut()
    logout()
    navigate('/login', { replace: true })
  }

  const { secondsLeft, stayActive } = useIdleTimeout({
    timeoutMs: IDLE_TIMEOUT_MS,
    warningMs: IDLE_WARNING_MS,
    enabled: true,
    onTimeout: () => signOut('timeout'),
  })

  return (
    <Dialog
      open={secondsLeft !== null}
      onOpenChange={(open) => {
        if (!open) stayActive()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you still there?</DialogTitle>
          <DialogDescription>
            For security, you will be signed out in {secondsLeft} seconds
            because of inactivity.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => signOut()}>
            Sign out now
          </Button>
          <Button onClick={stayActive}>Stay signed in</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}