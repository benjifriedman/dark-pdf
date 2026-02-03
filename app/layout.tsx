import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: 'Dark PDF - Comfortable PDF Reading in Dark Mode',
  description: 'Read PDFs comfortably with customizable dark mode filters. Adjust inversion, brightness, contrast, and sepia. Export filtered PDFs. Free and works offline.',
  keywords: ['pdf viewer', 'dark mode', 'pdf reader', 'eye strain', 'night mode', 'pdf filter'],
  authors: [{ name: 'Benji Friedman' }],
  openGraph: {
    title: 'Dark PDF - Comfortable PDF Reading in Dark Mode',
    description: 'Read PDFs comfortably with customizable dark mode filters. Adjust inversion, brightness, contrast, and sepia.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/dark-pdf.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
