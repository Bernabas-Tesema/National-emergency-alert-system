import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// After every test: remove what was rendered, and forget the mock session,
// so one test can never affect the next.
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})