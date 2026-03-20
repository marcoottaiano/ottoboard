'use client'

import { useQuery } from '@tanstack/react-query'

export interface IntegrationErrorLog {
  id: string
  service: 'linear' | 'strava'
  error_message: string
  error_code: string | null
  occurred_at: string
}

interface IntegrationHealth {
  linear: IntegrationErrorLog[]
  strava: IntegrationErrorLog[]
}

export function useIntegrationHealth() {
  return useQuery<IntegrationHealth>({
    queryKey: ['integration-health'],
    queryFn: async () => {
      const res = await fetch('/api/integration-health')
      if (!res.ok) throw new Error('Errore fetch integration health')
      return res.json()
    },
    staleTime: 60_000,
  })
}
