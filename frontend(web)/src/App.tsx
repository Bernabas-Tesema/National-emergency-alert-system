import { useState } from 'react'
import { Button } from '@/components/ui/button'
import LoginPage from '@/features/auth/LoginPage'
import { ROLE_LABELS } from '@/types/role'
import type { User } from '@/types/user'

function App() {
  const [user, setUser] = useState<User | null>(null)

  if (!user) {
    return <LoginPage onLoggedIn={setUser} />
  }

  // Temporary screen. We replace this with real routing in the next step.
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user.fullName}
        </h1>
        <p className="mt-2 text-slate-600">
          Role: {ROLE_LABELS[user.role]} · {user.organization}
        </p>
        <Button className="mt-4" onClick={() => setUser(null)}>
          Sign out
        </Button>
      </div>
    </div>
  )
}

export default App