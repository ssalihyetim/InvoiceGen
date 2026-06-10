import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Manual / fallback trigger for expiring overdue quotations.
// The DB function expire_overdue_quotations() (SECURITY DEFINER) flips any
// draft/sent quotation past its valid_until date to 'expired'. If pg_cron is
// available the migration schedules this daily; otherwise the Vercel Cron in
// vercel.json hits this route once a day (Vercel Crons issue GET requests).
//
// This route is exempt from the auth middleware (see middleware.ts matcher) —
// the middleware used to redirect Vercel's unauthenticated cron request to
// /auth/login, so the cron never actually ran. It authenticates via
// CRON_SECRET instead: Vercel automatically sends
// "Authorization: Bearer ${CRON_SECRET}" with cron invocations when the
// CRON_SECRET env var is set on the project. Without the env var the route
// fails closed.

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function runExpiry() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Supabase service role not configured' },
      { status: 500 }
    )
  }

  const supabase = createClient(url, serviceKey)

  const { data, error } = await supabase.rpc('expire_overdue_quotations')

  if (error) {
    console.error('expire-quotations error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`expire-quotations: ${data ?? 0} quotation(s) expired`)
  return NextResponse.json({ expired: data ?? 0 })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runExpiry()
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runExpiry()
}
