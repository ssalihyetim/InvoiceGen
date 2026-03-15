'use client'

import type { Metadata } from 'next'
import './globals.css'
import { useState } from 'react'
import { AuthProvider } from '@/lib/auth-context'

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
        <AuthProvider>
        <div className="flex h-screen">
          {/* Mobile Header - csak mobilde görünür */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-indigo-900 border-b border-indigo-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>📋</span>
              <h1 className="text-lg font-bold text-white">Teklif Sistemi</h1>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-indigo-700 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            w-64 bg-gradient-to-b from-indigo-900 to-indigo-800
            transform transition-transform duration-300
            lg:transform-none flex flex-col shadow-xl
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="p-6 border-b border-indigo-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">Teklif Sistemi</h1>
                  <p className="text-indigo-300 text-xs">Yönetim Paneli</p>
                </div>
              </div>
            </div>
            <nav className="px-3 py-4 space-y-1 flex-1">
              <a
                href="/"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">🏠</span>
                <span>Dashboard</span>
              </a>
              <a
                href="/products"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">📦</span>
                <span>Ürünler</span>
              </a>
              <a
                href="/companies"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">🏢</span>
                <span>Firmalar</span>
              </a>
              <a
                href="/quotations"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">📄</span>
                <span>Teklifler</span>
              </a>
              <a
                href="/pipeline"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">📊</span>
                <span>Pipeline</span>
              </a>
              <a
                href="/import"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">📤</span>
                <span>Dosya Yükle</span>
              </a>
              <a
                href="/settings/users"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">👥</span>
                <span>Kullanıcılar</span>
              </a>
              <a
                href="/settings/discounts"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">💰</span>
                <span>İskontolar</span>
              </a>
              <a
                href="/admin/audit-log"
                className="flex items-center gap-3 px-4 py-2.5 text-indigo-100 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-lg">📝</span>
                <span>Denetim Kaydı</span>
              </a>
            </nav>
            <div className="px-3 pb-4">
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 text-sm text-indigo-200 hover:bg-indigo-700 hover:text-white rounded-xl min-h-[44px] flex items-center gap-3 border border-indigo-700 transition-colors"
                >
                  <span>🚪</span>
                  <span>Çıkış Yap</span>
                </button>
              </form>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
        </AuthProvider>
      </body>
    </html>
  )
}
