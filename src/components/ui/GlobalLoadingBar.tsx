'use client'

import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export function GlobalLoadingBar() {
  const isFetching = useIsFetching()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isFetching > 0) {
      setVisible(true)
    } else {
      const t = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(t)
    }
  }, [isFetching])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] overflow-hidden pointer-events-none">
      <div
        className={`h-full transition-opacity duration-300 ${isFetching > 0 ? 'opacity-100' : 'opacity-0'}`}
        style={{ animation: 'loading-bar 1.4s ease-in-out infinite' }}
      >
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
      </div>
    </div>
  )
}
