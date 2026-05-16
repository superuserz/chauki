import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chauki — Bilingual Wordle',
    short_name: 'Chauki',
    description: 'A word a day, play as much as you want.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#121213',
    theme_color: '#121213',
    icons: [
      {
        src: '/api/icon/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/api/icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
