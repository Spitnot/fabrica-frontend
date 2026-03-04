import type { Metadata } from 'next'
import { Inter, Alexandria } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const alexandria = Alexandria({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-alexandria',
})

export const metadata: Metadata = {
  title: 'Firma Rollers B2B',
  description: 'Wholesale Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${alexandria.variable}`}>
      <body className="font-body bg-gray-100 text-black">
        {children}
      </body>
    </html>
  )
}
