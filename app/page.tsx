'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardMetrics {
  totalProducts: number
  activeCompanies: number
  pendingQuotations: number
  monthlyTotalsByCurrency: Record<string, number>
}

export default function Home() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardMetrics()
  }, [])

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Dashboard Metrics Yükleniyor...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40))
      console.log('Has Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      // Get total products count
      console.log('1️⃣ Products sorgusu başladı...')
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      console.log('Products sonuç:', { count: productsCount, error: productsError?.message })
      if (productsError) throw productsError

      // Get active companies count
      console.log('2️⃣ Companies sorgusu başladı...')
      const { count: companiesCount, error: companiesError } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })

      console.log('Companies sonuç:', { count: companiesCount, error: companiesError?.message })
      if (companiesError) throw companiesError

      // Get pending quotations count (status = 'draft')
      console.log('3️⃣ Quotations sorgusu başladı...')
      const { count: pendingCount, error: pendingError } = await supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')

      console.log('Quotations sonuç:', { count: pendingCount, error: pendingError?.message })
      if (pendingError) throw pendingError

      // Get current month's total grouped by currency
      const currentDate = new Date()
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const { data: monthlyQuotations, error: monthlyError } = await supabase
        .from('quotations')
        .select('final_amount, currency')
        .gte('created_at', firstDayOfMonth.toISOString())

      if (monthlyError) throw monthlyError

      const monthlyTotalsByCurrency = monthlyQuotations?.reduce((acc, q) => {
        const currency = q.currency || 'TRY'
        acc[currency] = (acc[currency] || 0) + (q.final_amount || 0)
        return acc
      }, {} as Record<string, number>) || {}

      console.log('✅ Tüm sorgular başarılı!')
      console.log('Final Metrics:', {
        products: productsCount,
        companies: companiesCount,
        quotations: pendingCount
      })

      setMetrics({
        totalProducts: productsCount || 0,
        activeCompanies: companiesCount || 0,
        pendingQuotations: pendingCount || 0,
        monthlyTotalsByCurrency
      })
    } catch (err) {
      console.error('❌ Dashboard metrics error:', err)
      setError(err instanceof Error ? err.message : 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Toplam Ürün</h3>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : error ? (
              <span className="text-red-500 text-sm">Hata</span>
            ) : (
              metrics?.totalProducts.toLocaleString('tr-TR')
            )}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Aktif Firmalar</h3>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : error ? (
              <span className="text-red-500 text-sm">Hata</span>
            ) : (
              metrics?.activeCompanies.toLocaleString('tr-TR')
            )}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Bekleyen Teklifler</h3>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : error ? (
              <span className="text-red-500 text-sm">Hata</span>
            ) : (
              metrics?.pendingQuotations.toLocaleString('tr-TR')
            )}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Bu Ay</h3>
          {loading ? (
            <p className="text-3xl font-bold text-gray-800 animate-pulse">...</p>
          ) : error ? (
            <p className="text-red-500 text-sm">Hata</p>
          ) : (
            <div className="space-y-1">
              {metrics && Object.keys(metrics.monthlyTotalsByCurrency).length > 0 ? (
                Object.entries(metrics.monthlyTotalsByCurrency).map(([currency, amount]) => (
                  <p key={currency} className="text-2xl font-bold text-gray-800">
                    {amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    {currency === 'TRY' || currency === 'TL' ? '₺' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}
                  </p>
                ))
              ) : (
                <p className="text-2xl font-bold text-gray-800">0.00 ₺</p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Veriler yüklenirken hata oluştu: {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Hoş Geldiniz</h2>
        <p className="text-gray-600">
          Teklif yönetim sisteminize hoş geldiniz. Başlamak için menüden istediğiniz bölümü seçebilirsiniz.
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-500">✓ Excel ile toplu ürün ekleyin</p>
          <p className="text-sm text-gray-500">✓ Firma bazlı iskonto kuralları oluşturun</p>
          <p className="text-sm text-gray-500">✓ AI destekli otomatik teklif hazırlayın</p>
        </div>
      </div>
    </div>
  )
}
