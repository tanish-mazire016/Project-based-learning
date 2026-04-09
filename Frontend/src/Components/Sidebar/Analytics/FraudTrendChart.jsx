import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { groupByDate, formatDateShort } from '../../../DateUtils'
import { ZoomIn, ZoomOut } from 'lucide-react'

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/95 " +
  "shadow-[0_18px_45px_rgba(15,23,42,0.75)] p-6"

const FraudTrendChart = ({ data, dateRange }) => {
  const [zoomLevel, setZoomLevel] = useState(1)

  // ✅ Calculate correct status from risk score
  const getCalculatedStatus = (riskScore) => {
    if (riskScore >= 70) return 'Fraud'
    if (riskScore >= 40) return 'Suspicious'
    return 'Safe'
  }

  // Generate trend data
  const generateTrendData = () => {
    if (!data || data.length === 0) return []

    const grouped = groupByDate(data)
    
    const chartData = Object.keys(grouped)
      .sort()
      .map(date => {
        const transactions = grouped[date]
        // ✅ Use calculated status instead of CSV status
        const fraudCount = transactions.filter(tx => getCalculatedStatus(tx.riskScore) === 'Fraud').length
        
        return {
          date: formatDateShort(transactions[0].time),
          fullDate: date,
          fraudCount,
          totalTransactions: transactions.length
        }
      })

    return chartData
  }

  const chartData = generateTrendData()

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 shadow-xl">
        <p className="font-semibold text-white mb-2">{label}</p>
        <p className="text-sm text-rose-400">Fraud: {payload[0]?.value}</p>
        <p className="text-sm text-sky-400">Total: {payload[1]?.value}</p>
      </div>
    )
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1))
  }

  // Calculate chart width based on zoom
  const chartWidth = Math.max(1200, chartData.length * 40 * zoomLevel)

  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Fraud Detection Trend</h2>
          <p className="text-sm text-slate-300/80">Daily fraud cases vs total transactions</p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className={`p-2 rounded-lg transition-colors ${
              zoomLevel <= 1
                ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-400 min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className={`p-2 rounded-lg transition-colors ${
              zoomLevel >= 3
                ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="overflow-x-auto overflow-y-hidden">
        <div style={{ width: `${chartWidth}px`, minWidth: '100%' }}>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#e5e7eb"
                style={{ fontSize: '12px' }}
                tickLine={false}
                interval={zoomLevel > 1.5 ? 0 : 'preserveStartEnd'}
                angle={zoomLevel > 1.5 ? -45 : 0}
                textAnchor={zoomLevel > 1.5 ? 'end' : 'middle'}
                height={zoomLevel > 1.5 ? 80 : 60}
              />
              <YAxis stroke="#e5e7eb" style={{ fontSize: '12px' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#e5e7eb' }} iconType="circle" />
              <Line
                type="monotone"
                dataKey="fraudCount"
                name="Fraud Cases"
                stroke="#f87171"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f87171' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="totalTransactions"
                name="Total Transactions"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3, fill: '#38bdf8' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zoom Hint */}
      {chartData.length > 20 && zoomLevel === 1 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            💡 Use zoom controls to expand the chart for better visibility
          </p>
        </div>
      )}
    </div>
  )
}

export default FraudTrendChart
