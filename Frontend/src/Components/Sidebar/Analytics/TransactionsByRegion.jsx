import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/95 " +
  "shadow-[0_18px_45px_rgba(15,23,42,0.75)] p-6"

const TransactionsByRegion = ({ data }) => {
  // ✅ Calculate correct status from risk score
  const getCalculatedStatus = (riskScore) => {
    if (riskScore >= 70) return 'Fraud'
    if (riskScore >= 40) return 'Suspicious'
    return 'Safe'
  }

  // Group transactions by location
  const generateRegionData = () => {
    if (!data || data.length === 0) return []

    const regionMap = {}

    data.forEach((tx) => {
      const region = tx.location || 'Unknown'
      const calculatedStatus = getCalculatedStatus(tx.riskScore) // ✅ Calculate from risk score

      if (!regionMap[region]) {
        regionMap[region] = { 
          region, 
          transactions: 0, 
          frauds: 0,
          suspicious: 0,
          safe: 0
        }
      }

      regionMap[region].transactions++
      
      // ✅ Count based on calculated status
      if (calculatedStatus === 'Fraud') {
        regionMap[region].frauds++
      } else if (calculatedStatus === 'Suspicious') {
        regionMap[region].suspicious++
      } else {
        regionMap[region].safe++
      }
    })

    // Add fraud rate and sort by transactions
    return Object.values(regionMap)
      .map(r => ({
        ...r,
        fraudRate: ((r.frauds / r.transactions) * 100).toFixed(1)
      }))
      .sort((a, b) => b.transactions - a.transactions)
      .slice(0, 8) // Top 8 regions
  }

  const chartData = generateRegionData()

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload

    return (
      <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 shadow-xl">
        <p className="font-semibold text-white mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm text-sky-400">Total: {data.transactions.toLocaleString()}</p>
          <p className="text-sm text-emerald-400">Safe: {data.safe}</p>
          <p className="text-sm text-amber-400">Suspicious: {data.suspicious}</p>
          <p className="text-sm text-rose-400">Fraud: {data.frauds}</p>
          <p className="text-sm text-slate-300 font-semibold mt-2 pt-2 border-t border-slate-700">
            Fraud Rate: {data.fraudRate}%
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Transactions by Region</h2>
        <p className="text-sm text-slate-300/80">Geographic distribution of transactions and fraud</p>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" vertical={false} />
            <XAxis
              dataKey="region"
              stroke="#e5e7eb"
              style={{ fontSize: '12px' }}
              tickLine={false}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#e5e7eb" style={{ fontSize: '12px' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
            <Bar dataKey="safe" name="Safe" fill="#10b981" radius={[4, 4, 0, 0]} stackId="stack" />
            <Bar dataKey="suspicious" name="Suspicious" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="stack" />
            <Bar dataKey="frauds" name="Fraud" fill="#f87171" radius={[4, 4, 0, 0]} stackId="stack" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-400">No data available</p>
        </div>
      )}
    </div>
  )
}

export default TransactionsByRegion
