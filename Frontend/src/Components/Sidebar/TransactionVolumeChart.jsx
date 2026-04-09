// TransactionVolumeChart.jsx
import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'


const TransactionVolumeChart = () => {
  // Reusable card class for consistent styling
  const cardClass =
    'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ' +
    'shadow-[0_18px_45px_rgba(15,23,42,0.75)]'

  // TODO: Replace with actual API data
  // Fetch transaction volume data from your backend
  const volumeData = [
    { time: '00:00', total: 234, flagged: 8 },
    { time: '02:00', total: 180, flagged: 4 },
    { time: '04:00', total: 95, flagged: 2 },
    { time: '06:00', total: 550, flagged: 18 },
    { time: '08:00', total: 880, flagged: 25 },
    { time: '10:00', total: 920, flagged: 32 },
    { time: '12:00', total: 1150, flagged: 45 },
    { time: '14:00', total: 1050, flagged: 38 },
    { time: '16:00', total: 780, flagged: 28 },
    { time: '18:00', total: 620, flagged: 20 },
    { time: '20:00', total: 450, flagged: 12 },
    { time: '22:00', total: 310, flagged: 8 }
  ]

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

  return (
    <div className={`${cardClass} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Transaction Volume</h2>
          <p className="text-sm text-slate-300">Today&apos;s activity over time</p>
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
