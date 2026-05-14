import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, DM_Sans } from 'next/font/google'
import './globals.css'

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const dm = DM_Sans({ subsets: ['latin'], variable: '--font-dm' })

export const metadata: Metadata = {
  title: 'IronLog',
  description: 'Tu diario de entrenamiento',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'IronLog' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bebas.variable} ${dm.variable}`}>
      <body className="bg-bg text-white font-body antialiased">{children}</body>
    </html>
  )
}
