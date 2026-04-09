import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/95 " +
  "shadow-[0_18px_45px_rgba(15,23,42,0.75)] p-6"

const RiskScoreDistribution = ({ data }) => {
  // Create histogram bins
  const generateDistribution = () => {
    const bins = [
      { range: '0-20', min: 0, max: 20, count: 0, color: '#10b981' },
      { range: '21-40', min: 21, max: 40, count: 0, color: '#84cc16' },
      { range: '41-60', min: 41, max: 60, count: 0, color: '#f59e0b' },
      { range: '61-80', min: 61, max: 80, count: 0, color: '#f97316' },
      { range: '81-100', min: 81, max: 100, count: 0, color: '#ef4444' }
    ]

    if (!data || data.length === 0) return bins

    data.forEach((tx) => {
      const score = tx.riskScore
      const bin = bins.find((b) => score >= b.min && score <= b.max)
      if (bin) bin.count++
    })

    return bins
  }

  const chartData = generateDistribution()

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload

    return (
      <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 shadow-xl">
        <p className="font-semibold text-white mb-1">Risk Score: {data.range}</p>
        <p className="text-sm text-sky-400">Transactions: {data.count.toLocaleString()}</p>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Risk Score Distribution</h2>
        <p className="text-sm text-slate-300/80">Transaction count by risk level</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" vertical={false} />
          <XAxis
            dataKey="range"
            stroke="#e5e7eb"
            style={{ fontSize: '12px' }}
            tickLine={false}
          />
          <YAxis stroke="#e5e7eb" style={{ fontSize: '12px' }} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-5 gap-2 mt-4">
        {chartData.map((item) => (
          <div key={item.range} className="text-center">
            <div className="w-full h-2 rounded-full mb-1" style={{ backgroundColor: item.color }} />
            <p className="text-xs text-slate-300/80">{item.range}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RiskScoreDistribution
