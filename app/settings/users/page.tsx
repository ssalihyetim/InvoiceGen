'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Role, ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'

type TenantUser = {
  id: string
  user_id: string | null
  role: Role
  created_at: string | null
  email?: string | null
}

export default function UsersPage() {
  const { role, tenantId } = useAuth()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('viewer')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadUsers()
  }, [tenantId])

  const loadUsers = async () => {
    if (!tenantId) return
    const supabase = createSupabaseBrowserClient()

    const { data, error } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at')

    if (data) {
      // Get user emails from auth (we can only see our own, but admin can see tenant members)
      setUsers(data.map(u => ({ ...u, role: u.role as Role })))
    }
    setLoading(false)
  }

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from('tenant_users')
      .update({ role: newRole })
      .eq('tenant_id', tenantId!)
      .eq('user_id', userId)

    if (error) {
      setMessage({ type: 'error', text: 'Rol güncellenemedi: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Rol güncellendi' })
      loadUsers()
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı kaldırmak istediğinizden emin misiniz?')) return

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from('tenant_users')
      .delete()
      .eq('tenant_id', tenantId!)
      .eq('user_id', userId)

    if (error) {
      setMessage({ type: 'error', text: 'Kullanıcı kaldırılamadı: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Kullanıcı kaldırıldı' })
      loadUsers()
    }
  }

  if (role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Erişim Reddedildi</h1>
        <p className="text-gray-600">Bu sayfaya yalnızca yöneticiler erişebilir.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Kullanıcı Yönetimi</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* User List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Ekip Üyeleri</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Henüz kullanıcı yok</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4">Kullanıcı ID</th>
                <th className="text-left p-4">Rol</th>
                <th className="text-left p-4">Katılma Tarihi</th>
                <th className="text-center p-4">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="p-4 font-mono text-xs">{(u.user_id ?? '').slice(0, 8)}...</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => u.user_id && handleUpdateRole(u.user_id, e.target.value as Role)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => u.user_id && handleRemoveUser(u.user_id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Kaldır
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info about inviting users */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Yeni Kullanıcı Ekleme</h3>
        <p className="text-sm text-blue-700">
          Yeni kullanıcılar kayıt sayfası üzerinden hesap oluşturmalıdır.
          Ardından bu sayfadan rollerini değiştirebilirsiniz.
          Aynı tenant'a eklemek için doğrudan veritabanından tenant_users kaydı oluşturmanız gerekmektedir.
        </p>
      </div>
    </div>
  )
}
