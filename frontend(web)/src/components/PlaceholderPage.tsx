import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { ROLE_LABELS } from '@/types/role'

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-2 text-slate-600">{description}</p>}
        {user && (
          <p className="mt-4 text-sm text-slate-500">
            Signed in as {user.fullName} · {ROLE_LABELS[user.role]}
          </p>
        )}
        <Button className="mt-4" onClick={logout}>
          {user ? 'Sign out' : 'Go to sign in'}
        </Button>
      </div>
    </div>
  )
}