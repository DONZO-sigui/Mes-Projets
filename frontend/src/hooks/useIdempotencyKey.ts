import { useRef, useCallback } from 'react'

export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null)

  const generate = useCallback((): string => {
    keyRef.current = crypto.randomUUID()
    return keyRef.current
  }, [])

  const current = useCallback((): string | null => keyRef.current, [])

  const reset = useCallback(() => {
    keyRef.current = null
  }, [])

  return { generate, current, reset }
}
