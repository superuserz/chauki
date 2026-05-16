export function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export function msUntilNextUtcMidnight(now: Date = new Date()): number {
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  )
  return tomorrow.getTime() - now.getTime()
}

export function formatHms(ms: number): { hours: number; minutes: number; seconds: number } {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  }
}
