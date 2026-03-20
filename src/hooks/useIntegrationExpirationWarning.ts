'use client'

import { useStravaConnection } from './useStravaConnection'
import { useIntegrationHealth } from './useIntegrationHealth'
import { useLinearConnection } from './useLinearConnection'

export interface ExpirationWarning {
  service: 'strava' | 'linear'
  expired: boolean // true = already expired/lost; false = expiring soon
  hoursUntilExpiry?: number // only for Strava expiring-soon case
}

export function useIntegrationExpirationWarning(): ExpirationWarning[] {
  const { isConnected: stravaConnected, expiresAt } = useStravaConnection()
  const { isConnected: linearConnected } = useLinearConnection()
  const { data: health } = useIntegrationHealth()

  const warnings: ExpirationWarning[] = []

  // Strava: check token expiry
  if (stravaConnected && expiresAt) {
    const expiresMs = new Date(expiresAt).getTime()
    const nowMs = Date.now()
    const hoursUntilExpiry = (expiresMs - nowMs) / (1000 * 60 * 60)

    if (hoursUntilExpiry <= 0) {
      warnings.push({ service: 'strava', expired: true })
    } else if (hoursUntilExpiry <= 48) {
      warnings.push({
        service: 'strava',
        expired: false,
        hoursUntilExpiry: Math.ceil(hoursUntilExpiry),
      })
    }
  }

  // Linear: check for recent TOKEN_REVOKED or 401 errors
  if (linearConnected) {
    const linearErrors = health?.linear ?? []
    const hasAuthError = linearErrors.some(
      (log) => log.error_code === 'TOKEN_REVOKED' || log.error_code === '401'
    )
    if (hasAuthError) {
      warnings.push({ service: 'linear', expired: true })
    }
  }

  return warnings
}
