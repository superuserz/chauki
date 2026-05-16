import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    <div
      style={{
        background: '#6aaa64',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 320,
        fontWeight: 900,
        fontFamily: 'serif',
      }}
    >
      C
    </div>,
    { width: 512, height: 512 }
  )
}
