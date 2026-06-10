import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requirePermission } from '@/lib/api-auth'

// Email sending endpoint using Resend
// Requires RESEND_API_KEY env var
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (auth instanceof NextResponse) return auth

  // Sending flips the quotation to 'sent' — treat as an update
  const denied = requirePermission(auth, 'quotations', 'update')
  if (denied) return denied

  const { supabase, tenantId } = auth

  try {
    const { quotationId, recipientEmail, subject, message } = await request.json()

    if (!quotationId || !recipientEmail) {
      return NextResponse.json(
        { error: 'quotationId ve recipientEmail gereklidir' },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Email servisi yapılandırılmamış (RESEND_API_KEY eksik)' },
        { status: 500 }
      )
    }

    // Fetch quotation with company info — tenant filter is defense-in-depth
    // on top of RLS so a guessed UUID can never cross tenants
    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .select('*, companies(name, email)')
      .eq('id', quotationId)
      .eq('tenant_id', tenantId)
      .single()

    if (qError || !quotation) {
      return NextResponse.json({ error: 'Teklif bulunamadı' }, { status: 404 })
    }

    // Send email via Resend
    const emailSubject = subject || `Teklif: ${quotation.quotation_number}`
    const emailBody = message || `Sayın yetkili,\n\nEkte ${quotation.quotation_number} numaralı teklifimizi bulabilirsiniz.\n\nSaygılarımızla.`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OfferGen <noreply@offergen.app>',
        to: [recipientEmail],
        subject: emailSubject,
        text: emailBody,
      }),
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend error:', resendResult)
      return NextResponse.json(
        { error: 'Email gönderilemedi: ' + (resendResult.message || 'Bilinmeyen hata') },
        { status: 500 }
      )
    }

    // Update quotation status to 'sent'
    await supabase
      .from('quotations')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', quotationId)
      .eq('tenant_id', tenantId)

    // Log email (failure to log must not fail the send)
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        quotation_id: quotationId,
        recipient_email: recipientEmail,
        subject: emailSubject,
        status: 'sent',
        resend_id: resendResult.id,
        tenant_id: tenantId,
      })
    if (logError) console.error('Email log error:', logError)

    return NextResponse.json({
      success: true,
      message: 'Email başarıyla gönderildi',
      resend_id: resendResult.id,
    })
  } catch (error: any) {
    console.error('Send quotation error:', error)
    return NextResponse.json(
      { error: error.message || 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}
