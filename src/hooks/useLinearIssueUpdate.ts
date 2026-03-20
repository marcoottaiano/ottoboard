'use client'

import { useMutation } from '@tanstack/react-query'

export function useLinearIssueUpdate() {
  return useMutation({
    mutationFn: async ({ issueId, stateId }: { issueId: string; stateId: string }) => {
      const res = await fetch('/api/linear/update-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, stateId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Errore aggiornamento Linear')
      }
    },
  })
}
