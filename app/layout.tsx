import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Teklif Yönetim Sistemi',
  description: 'Otomatik teklif oluşturma ve yönetim sistemi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200">
            <div className="p-6">
              <h1 className="text-xl font-bold text-gray-800">Teklif Sistemi</h1>
            </div>
            <nav className="px-4 space-y-2">
              <a href="/" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Dashboard
              </a>
              <a href="/products" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Ürünler
              </a>
              <a href="/companies" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Firmalar
              </a>
              <a href="/quotations" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Teklifler
              </a>
              <a href="/import" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Excel Import
              </a>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
