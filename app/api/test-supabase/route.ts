import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Supabase Test başladı...')

    // Environment variables kontrol
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('Env Check:', { hasUrl, hasKey })

    // Products tablosu test
    const { data: products, error: productsError, count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: false })
      .limit(3)

    console.log('Products Query Result:', {
      count: productsCount,
      dataLength: products?.length,
      hasError: !!productsError,
      error: productsError
    })

    // Companies tablosu test
    const { data: companies, error: companiesError, count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: false })
      .limit(3)

    // Quotations tablosu test
    const { data: quotations, error: quotationsError, count: quotationsCount } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: false })
      .limit(3)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        hasUrl,
        hasKey,
        url: hasUrl ? process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + '...' : 'MISSING'
      },
      results: {
        products: {
          count: productsCount,
          sampleData: products?.length || 0,
          error: productsError?.message || null,
          firstItem: products?.[0] ? {
            code: (products[0] as any).product_code,
            type: (products[0] as any).product_type?.substring(0, 40)
          } : null
        },
        companies: {
          count: companiesCount,
          sampleData: companies?.length || 0,
          error: companiesError?.message || null
        },
        quotations: {
          count: quotationsCount,
          sampleData: quotations?.length || 0,
          error: quotationsError?.message || null
        }
      }
    })
  } catch (error: any) {
    console.error('❌ Test API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
