import { NextResponse } from 'next/server'

const startedAt = Date.now()

export function GET() {
  return NextResponse.json({
    data: {
      status: 'ok',
      service: 'chauki-api',
      version: process.env.npm_package_version ?? 'dev',
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    },
  })
}
