import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'

function TestConsumer() {
  const { isAuthenticated, user, isLoading } = useAuth()
  if (isLoading) return <span>loading</span>
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'authenticated' : 'anonymous'}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('starts unauthenticated when localStorage is empty', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    // Wait for init effect
    await screen.findByTestId('auth')
    expect(screen.getByTestId('auth').textContent).toBe('anonymous')
  })

  it('rehydrates user from localStorage', async () => {
    const fakeUser = {
      id: 'abc123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'USER',
      status: 'ACTIVE',
      is_email_verified: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }
    localStorage.setItem('auth_user', JSON.stringify(fakeUser))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await screen.findByTestId('auth')
    expect(screen.getByTestId('auth').textContent).toBe('authenticated')
    expect(screen.getByTestId('user').textContent).toBe('test@example.com')
  })

  it('logs out when auth:logout event fires', async () => {
    const fakeUser = {
      id: 'abc',
      email: 'user@test.com',
      first_name: 'A',
      last_name: 'B',
      role: 'USER',
      status: 'ACTIVE',
      is_email_verified: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }
    localStorage.setItem('auth_user', JSON.stringify(fakeUser))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await screen.findByTestId('auth')
    expect(screen.getByTestId('auth').textContent).toBe('authenticated')

    act(() => {
      window.dispatchEvent(new Event('auth:logout'))
    })

    expect(screen.getByTestId('auth').textContent).toBe('anonymous')
  })
})
