'use client'

import type { Metadata } from 'next'
import './globals.css'
import { useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <html lang="tr">
      <head>
        <title>Teklif Yönetim Sistemi</title>
        <meta name="description" content="Otomatik teklif oluşturma ve yönetim sistemi" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Mobile Header - csak mobilde görünür */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold">Teklif Sistemi</h1>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={mobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Overlay - mobilde menü açıkken */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-64 bg-white border-r border-gray-200
            transform transition-transform duration-300
            lg:transform-none
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="p-6">
              <h1 className="text-xl font-bold text-gray-800">Teklif Sistemi</h1>
            </div>
            <nav className="px-4 space-y-2">
              <a
                href="/"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </a>
              <a
                href="/products"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ürünler
              </a>
              <a
                href="/companies"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Firmalar
              </a>
              <a
                href="/quotations"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Teklifler
              </a>
              <a
                href="/import"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Excel Import
              </a>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
