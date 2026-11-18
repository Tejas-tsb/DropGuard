import { useEffect, useState } from 'react'

export interface ApiQueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useApiQuery<T>(load: () => Promise<T>): ApiQueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    load()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'The request failed.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [attempt, load])

  return { data, loading, error, reload: () => setAttempt((value) => value + 1) }
}
