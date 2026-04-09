import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/95 " +
  "shadow-[0_18px_45px_rgba(15,23,42,0.75)] p-6"

const TopFraudTypes = ({ data }) => {
  // ✅ Calculate correct status from risk score
  const getCalculatedStatus = (riskScore) => {
    if (riskScore >= 70) return 'Fraud'
    if (riskScore >= 40) return 'Suspicious'
    return 'Safe'
  }

  // Categorize frauds by device type as proxy for fraud type
  const generateFraudTypes = () => {
    if (!data || data.length === 0) return []

    // ✅ Filter by calculated status, not CSV status
    const fraudData = data.filter(tx => getCalculatedStatus(tx.riskScore) === 'Fraud')
    const typeMap = {}

    fraudData.forEach((tx) => {
      const device = tx.device || 'Unknown'
      let category = 'Other'

      if (device.toLowerCase().includes('iphone') || device.toLowerCase().includes('apple')) {
        category = 'iOS Device Fraud'
      } else if (device.toLowerCase().includes('samsung') || device.toLowerCase().includes('android')) {
        category = 'Android Device Fraud'
      } else if (device.toLowerCase().includes('mac') || device.toLowerCase().includes('laptop')) {
        category = 'Desktop/Laptop Fraud'
      } else if (device.toLowerCase().includes('ipad') || device.toLowerCase().includes('tab')) {
        category = 'Tablet Fraud'
      } else if (device.toLowerCase().includes('dell') || device.toLowerCase().includes('hp')) {
        category = 'Desktop/Laptop Fraud'
      } else if (device.toLowerCase().includes('pixel') || device.toLowerCase().includes('oneplus')) {
        category = 'Android Device Fraud'
      } else {
        category = 'Unknown Device'
      }

      if (!typeMap[category]) {
        typeMap[category] = 0
      }
      typeMap[category]++
    })

    const total = fraudData.length
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16']

    return Object.entries(typeMap)
      .map(([type, count], index) => ({
        type,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  const chartData = generateFraudTypes()

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload

    return (
      <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 shadow-xl">
        <p className="font-semibold text-white mb-1">{data.type}</p>
        <p className="text-sm text-sky-400">Cases: {data.count}</p>
        <p className="text-sm text-slate-300">Percentage: {data.percentage}%</p>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Top Fraud Types</h2>
        <p className="text-sm text-slate-300/80">Most common fraud categories detected</p>
      </div>

      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} layout="vertical">
              <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" horizontal={false} />
              <XAxis type="number" stroke="#e5e7eb" style={{ fontSize: '12px' }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="type"
                stroke="#e5e7eb"
                style={{ fontSize: '12px' }}
                tickLine={false}
                width={150}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {chartData.map((item) => (
              <div key={item.type} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-slate-300">{item.type}</span>
                <span className="text-xs text-slate-400 ml-auto">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-400">No fraud cases detected</p>
        </div>
      )}
    </div>
  )
}

export default TopFraudTypes
