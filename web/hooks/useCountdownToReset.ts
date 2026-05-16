'use client'
import { useEffect, useState } from 'react'
import { formatHms, msUntilNextUtcMidnight } from '@/lib/time'

export function useCountdownToReset() {
  const [ms, setMs] = useState(() => msUntilNextUtcMidnight())
  useEffect(() => {
    const tick = () => setMs(msUntilNextUtcMidnight())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return formatHms(ms)
}
