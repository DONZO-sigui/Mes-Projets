import type { AxiosError } from 'axios'
import type { ApiError } from '../types'

interface Props {
  error: Error | AxiosError | unknown
  className?: string
}

function extractMessage(error: unknown): string {
  if (!error) return 'Une erreur est survenue.'
  const axiosErr = error as AxiosError<ApiError>
  const apiMsg = axiosErr.response?.data?.error?.message
  if (apiMsg) return apiMsg
  if (error instanceof Error) return error.message
  return 'Une erreur est survenue.'
}

export function ErrorMessage({ error, className = '' }: Props) {
  return (
    <div className={`alert alert-danger d-flex align-items-center gap-2 ${className}`} role="alert">
      <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
      <span>{extractMessage(error)}</span>
    </div>
  )
}
