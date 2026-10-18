import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { rememberTimeoutSignOut } from '@/lib/session'
import AuthProvider from './AuthProvider'
import LoginPage from './LoginPage'

// The mock login waits about 0.4s per step, so allow some time.
const WAIT = { timeout: 3000 }

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/insa/dashboard" element={<p>INSA dashboard page</p>} />
          <Route
            path="/resource/dashboard"
            element={<p>Resource dashboard page</p>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function submitCredentials(username: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Username'), username)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  return user
}

async function submitCode(user: UserEvent, code: string) {
  const box = await screen.findByLabelText('Verification code', {}, WAIT)
  await user.type(box, code)
  await user.click(screen.getByRole('button', { name: 'Verify and sign in' }))
}

describe('login page', () => {
  it('rejects a wrong password', async () => {
    renderLogin()
    await submitCredentials('sysadmin1', 'wrong-password')
    expect(
      await screen.findByText('Invalid username or password', {}, WAIT),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument()
  })

  it('rejects a wrong 2FA code', async () => {
    renderLogin()
    const user = await submitCredentials('sysadmin1', 'Password123!')
    await submitCode(user, '000000')
    expect(
      await screen.findByText('Incorrect verification code', {}, WAIT),
    ).toBeInTheDocument()
  })

  it('sends a system admin to the INSA dashboard', async () => {
    renderLogin()
    const user = await submitCredentials('sysadmin1', 'Password123!')
    await submitCode(user, '123456')
    expect(
      await screen.findByText('INSA dashboard page', {}, WAIT),
    ).toBeInTheDocument()
  })

  it('sends a provider to the resource dashboard', async () => {
    renderLogin()
    const user = await submitCredentials('provider1', 'Password123!')
    await submitCode(user, '123456')
    expect(
      await screen.findByText('Resource dashboard page', {}, WAIT),
    ).toBeInTheDocument()
  })

  it('tells a citizen to use the mobile app and does not sign them in', async () => {
    renderLogin()
    const user = await submitCredentials('citizen1', 'Password123!')
    await submitCode(user, '123456')
    expect(
      await screen.findByText('Please use the mobile app.', {}, WAIT),
    ).toBeInTheDocument()
    expect(screen.queryByText('INSA dashboard page')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('ness-mock-user')).toBeNull()
  })

  it('explains an inactivity sign-out', () => {
    rememberTimeoutSignOut()
    renderLogin()
    expect(
      screen.getByText(/signed out because of inactivity/i),
    ).toBeInTheDocument()
  })

  it('shows no inactivity message on a normal visit', () => {
    renderLogin()
    expect(
      screen.queryByText(/signed out because of inactivity/i),
    ).not.toBeInTheDocument()
  })
})