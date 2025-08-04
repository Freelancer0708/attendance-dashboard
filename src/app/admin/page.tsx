'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Attendance = {
  user_email: string
  date: string
  clock_in_time: string | null
  task_summary: string | null
  hours_worked: number | null
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<Attendance[]>([])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      // 管理者チェック（仮にadmin@example.comだけ許可）
      if (session?.user?.email !== 'admin@example.com') {
        alert('管理者のみアクセス可能です')
        window.location.href = '/'
        return
      }

      // 勤怠 + 日報情報を結合取得
      const { data, error } = await supabase.rpc('admin_dashboard_view')
      if (error) console.error(error)
      else setRecords(data)

      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) return <p className="p-4">読み込み中...</p>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">📊 管理者ダッシュボード</h1>
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">ユーザー</th>
            <th className="p-2 border">日付</th>
            <th className="p-2 border">出勤時間</th>
            <th className="p-2 border">作業内容</th>
            <th className="p-2 border">時間</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i}>
              <td className="p-2 border">{r.user_email}</td>
              <td className="p-2 border">{r.date}</td>
              <td className="p-2 border">{r.clock_in_time ?? '-'}</td>
              <td className="p-2 border">{r.task_summary ?? '-'}</td>
              <td className="p-2 border">{r.hours_worked ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
