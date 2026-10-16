import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorMessage } from '../components/ErrorMessage'

describe('ErrorMessage', () => {
  it('renders a generic message for plain Error', () => {
    render(<ErrorMessage error={new Error('Something broke')} />)
    expect(screen.getByRole('alert').textContent).toContain('Something broke')
  })

  it('extracts API error message from AxiosError shape', () => {
    const fakeAxios = {
      response: {
        data: {
          error: { code: 'NOT_FOUND', message: 'Ressource introuvable.', details: null },
        },
      },
    }
    render(<ErrorMessage error={fakeAxios} />)
    expect(screen.getByRole('alert').textContent).toContain('Ressource introuvable.')
  })

  it('falls back to generic message for unknown error', () => {
    render(<ErrorMessage error={null} />)
    expect(screen.getByRole('alert').textContent).toContain('Une erreur est survenue')
  })
})
