import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parenting Planner',
  description: 'Tools for new parents to organize and coordinate parenting tasks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}