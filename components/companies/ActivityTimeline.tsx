'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type TimelineEvent = {
  id: string
  entity_type: string
  action: string
  created_at: string
  new_data: Record<string, any> | null
  old_data: Record<string, any> | null
}

interface ActivityTimelineProps {
  companyId: string
}

const ACTION_ICONS: Record<string, string> = {
  create: '+',
  update: '~',
  delete: '-',
  status_change: '*',
}

export default function ActivityTimeline({ companyId }: ActivityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [companyId])

  const loadEvents = async () => {
    const supabase = createSupabaseBrowserClient()

    // Get audit logs for this company + its quotations
    const { data: companyLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'companies')
      .eq('entity_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Also get quotation events for this company
    const { data: quotationLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'quotations')
      .or(`new_data->>company_id.eq.${companyId},old_data->>company_id.eq.${companyId}`)
      .order('created_at', { ascending: false })
      .limit(20)

    const allEvents = [
      ...(companyLogs || []),
      ...(quotationLogs || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setEvents(allEvents.slice(0, 30) as TimelineEvent[])
    setLoading(false)
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Yükleniyor...</div>
  }

  if (events.length === 0) {
    return <div className="text-sm text-gray-500">Henüz aktivite yok</div>
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-700 text-sm">Aktivite Geçmişi</h3>
      <div className="relative pl-6 space-y-4">
        {/* Timeline line */}
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

        {events.map(event => {
          const icon = ACTION_ICONS[event.action] || '?'
          const entityName = event.new_data?.quotation_number
            || event.new_data?.name
            || event.old_data?.quotation_number
            || event.old_data?.name
            || ''

          let description = ''
          if (event.entity_type === 'quotations') {
            if (event.action === 'create') description = `Teklif oluşturuldu: ${entityName}`
            else if (event.action === 'status_change') {
              description = `Teklif durumu: ${event.old_data?.status} → ${event.new_data?.status}`
            }
            else if (event.action === 'update') description = `Teklif güncellendi: ${entityName}`
            else if (event.action === 'delete') description = `Teklif silindi: ${entityName}`
          } else if (event.entity_type === 'companies') {
            if (event.action === 'create') description = 'Firma oluşturuldu'
            else if (event.action === 'update') description = 'Firma bilgileri güncellendi'
          }

          return (
            <div key={event.id} className="relative flex gap-3 items-start">
              <div className="absolute -left-6 w-4 h-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-500">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{description}</p>
                <p className="text-xs text-gray-400">
                  {new Date(event.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
