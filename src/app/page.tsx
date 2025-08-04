'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { User } from '@supabase/supabase-js'

type DailyReport = {
  date: string
  task_summary: string | null
  hours_worked: number | null
  notes: string | null
}


export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [editingDate, setEditingDate] = useState<Date | null>(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [history, setHistory] = useState<DailyReport[]>([])

  const [taskSummary, setTaskSummary] = useState('')
  const [hoursWorked, setHoursWorked] = useState(0)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    getSession()
  }, [])

  useEffect(() => {
    if (!user) return

    const fetchReports = async () => {
      const { data: reportsData } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)

      const merged = reportsData?.map((r: any) => ({
        date: r.date,
        task_summary: r.task_summary,
        hours_worked: r.hours_worked,
        notes: r.notes,
      }))

      setHistory(merged?.sort((a: any, b: any) => (a.date < b.date ? 1 : -1)) ?? [])
    }

    fetchReports()
  }, [user, reportSubmitted])

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth)
    prev.setMonth(prev.getMonth() - 1)
    setCurrentMonth(prev)
  }

  const handleNextMonth = () => {
    const next = new Date(currentMonth)
    next.setMonth(next.getMonth() + 1)
    setCurrentMonth(next)
  }

  const handleDeleteReport = async () => {
    const dateStr = editingDate?.toISOString().slice(0, 10)
    if (!dateStr || !user) return
  
    const { data: existing } = await supabase
      .from('daily_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .maybeSingle()
  
    if (existing) {
      const confirmDelete = confirm(`日報（${dateStr}）を削除しますか？`)
      if (!confirmDelete) return
  
      await supabase.from('daily_reports').delete().eq('id', existing.id)
  
      setReportSubmitted(true)
      setTaskSummary('')
      setHoursWorked(0)
      setNotes('')
      setEditingDate(new Date())
    }
  }

  const filteredHistory = history.filter((item) => {
    const itemDate = new Date(item.date)
    return (
      itemDate.getFullYear() === currentMonth.getFullYear() &&
      itemDate.getMonth() === currentMonth.getMonth()
    )
  })

  const signInWithEmail = async () => {
    const email = prompt("メールアドレスを入力してください")
    if (email) {
      await supabase.auth.signInWithOtp({ email })
      alert('確認メールを送信しました')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleSubmitReport = async () => {
    const dateStr = editingDate?.toISOString().slice(0, 10)

    const { data: existing } = await supabase
      .from('daily_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .maybeSingle()

    if (existing) {
      await supabase.from('daily_reports').update({
        task_summary: taskSummary,
        hours_worked: hoursWorked,
        notes,
      }).eq('id', existing.id)
    } else {
      await supabase.from('daily_reports').insert([
        {
          user_id: user.id,
          date: dateStr,
          task_summary: taskSummary,
          hours_worked: hoursWorked,
          notes,
        }
      ])
    }

    setReportSubmitted(true)
    setTaskSummary('')
    setHoursWorked(0)
    setNotes('')
    setEditingDate(new Date())
  }

  const handleEdit = (item: DailyReport) => {
    setEditingDate(new Date(item.date))
    setTaskSummary(item.task_summary ?? '')
    setHoursWorked(item.hours_worked ?? 0)
    setNotes(item.notes ?? '')
    setReportSubmitted(false)
  }

  if (loading) return <p className="p-4">読み込み中...</p>

  if (!user) return (
    <div className="p-4">
      <h1 className="text-xl mb-4">日報アプリ</h1>
      <button onClick={signInWithEmail} className="bg-blue-600 text-white px-4 py-2 rounded">
        メールでログイン
      </button>
    </div>
  )

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">こんにちは、{user.email}</h1>

      {/* 日報入力フォーム */}
      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-bold">📋 日報入力・編集</h2>

        <label className="block text-sm font-semibold">対象日付</label>
        <DatePicker
          selected={editingDate}
          onChange={(date) => setEditingDate(date)}
          className="border p-2 rounded w-full"
          dateFormat="yyyy-MM-dd"
        />

        <input
          type="text"
          placeholder="作業概要"
          value={taskSummary}
          onChange={(e) => setTaskSummary(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="number"
          placeholder="作業時間（時間）"
          value={hoursWorked}
          onChange={(e) => setHoursWorked(Number(e.target.value))}
          className="w-full border p-2 rounded"
        />
        <textarea
          placeholder="補足・メモ"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <button
          onClick={handleSubmitReport}
          className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer"
        >
          日報を送信
        </button>
        {editingDate && (
          <button
            onClick={handleDeleteReport}
            className="mt-2 text-red-600 underline text-sm mx-10 cursor-pointer"
          >
            🗑 この日報を削除
          </button>
        )}
        {reportSubmitted && (
          <p className="text-green-600 font-semibold">✅ 日報を保存しました</p>
        )}
      </div>

      {/* 履歴表示 */}
      <div className="mt-10">
        <h2 className="text-lg font-bold mb-2">
          🗂 {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月 の記録
        </h2>

        <div className="mb-4 flex gap-2">
          <button onClick={handlePrevMonth} className="bg-gray-200 px-3 py-1 rounded text-black cursor-pointer">
            ⬅ 前の月
          </button>
          <button onClick={handleNextMonth} className="bg-gray-200 px-3 py-1 rounded text-black cursor-pointer">
            次の月 ➡
          </button>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-sm text-gray-500">この月の記録はありません。</p>
        ) : (
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border text-black">日付</th>
                <th className="p-2 border text-black">作業概要</th>
                <th className="p-2 border text-black">時間</th>
                <th className="p-2 border text-black">メモ</th>
                <th className="p-2 border text-black">編集</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item: DailyReport, idx: number) => (
                <tr key={idx}>
                  <td className="p-2 border">{item.date}</td>
                  <td className="p-2 border">{item.task_summary ?? '-'}</td>
                  <td className="p-2 border">{item.hours_worked ?? '-'}</td>
                  <td className="p-2 border">{item.notes ?? '-'}</td>
                  <td className="p-2 border">
                    <button
                      className="text-blue-400 underline text-xs cursor-pointer"
                      onClick={() => handleEdit(item)}
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button onClick={signOut} className="mt-6 text-sm text-gray-500 underline">ログアウト</button>
    </main>
  )
}
