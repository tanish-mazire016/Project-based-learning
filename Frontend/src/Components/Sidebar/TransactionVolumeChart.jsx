// TransactionVolumeChart.jsx
import React, { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { getHourlyActivity } from '../../api/client'


const TransactionVolumeChart = () => {
  // Reusable card class for consistent styling
  const cardClass =
    'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ' +
    'shadow-[0_18px_45px_rgba(15,23,42,0.75)]'

  const [volumeData, setVolumeData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getHourlyActivity()
        // Map API response to chart format (uses 'time' field for x-axis)
        const mapped = result.map(entry => ({
          time: entry.time || `${entry.hour}:00`,
          total: entry.transactions || 0,
          flagged: entry.flagged || 0,
        }))
        if (!cancelled) setVolumeData(mapped)
      } catch (err) {
        console.error('Failed to fetch transaction volume:', err)
        if (!cancelled) setError('Failed to load volume data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Custom Tooltip Component
  const VolumeTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    const total = payload.find(p => p.dataKey === 'total')?.value
    const flagged = payload.find(p => p.dataKey === 'flagged')?.value

    return (
      <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 shadow-xl">
        <p className="font-semibold text-white mb-2">{label}</p>
        <p className="text-sm text-sky-300">Transactions: {total}</p>
        <p className="text-sm text-rose-300">Flagged: {flagged}</p>
      </div>
    )
  }

  if (loading && volumeData.length === 0) {
    return (
      <div className={`${cardClass} p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Transaction Volume</h2>
            <p className="text-sm text-slate-300">Loading data...</p>
          </div>
        </div>
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-slate-400 text-sm">Loading transaction volume...</div>
        </div>
      </div>
    )
  }

  if (error && volumeData.length === 0) {
    return (
      <div className={`${cardClass} p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Transaction Volume</h2>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardClass} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Transaction Volume</h2>
          <p className="text-sm text-slate-300">Activity distribution over time</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-400"></div>
            <span className="text-slate-300">Total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-400"></div>
            <span className="text-slate-300">Flagged</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={volumeData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#e5e7eb"
            style={{ fontSize: '12px' }}
            tickLine={false}
          />
          <YAxis
            stroke="#e5e7eb"
            style={{ fontSize: '12px' }}
            tickLine={false}
          />
          <Tooltip content={<VolumeTooltip />} cursor={{ stroke: '#64748b', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#38bdf8"
            strokeWidth={3}
            fill="url(#colorTotal)"
            dot={{ r: 4, strokeWidth: 2, stroke: '#0f172a', fill: '#38bdf8' }}
            activeDot={{ r: 6, fill: '#38bdf8' }}
          />
          <Area
            type="monotone"
            dataKey="flagged"
            stroke="#f87171"
            strokeWidth={2}
            fillOpacity={0}
            dot={{ r: 3, strokeWidth: 2, stroke: '#0f172a', fill: '#f87171' }}
            activeDot={{ r: 5, fill: '#f87171' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TransactionVolumeChart
