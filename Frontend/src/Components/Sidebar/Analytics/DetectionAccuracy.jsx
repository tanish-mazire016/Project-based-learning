import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/95 " +
  "shadow-[0_18px_45px_rgba(15,23,42,0.75)] p-6"

const DetectionAccuracy = ({ data }) => {
  // Calculate correct status from risk score
  const getCalculatedStatus = (riskScore) => {
    if (riskScore >= 70) return 'Fraud'
    if (riskScore >= 40) return 'Suspicious'
    return 'Safe'
  }

  // Calculate accuracy metrics from actual data
  const calculateMetrics = () => {
    if (!data || data.length === 0) {
      return {
        accuracy: 0,
        falsePositiveRate: 0,
        truePositiveRate: 0
      }
    }

    const total = data.length
    //  Use calculated status
    const fraudCount = data.filter(t => getCalculatedStatus(t.riskScore) === 'Fraud').length
    const suspiciousCount = data.filter(t => getCalculatedStatus(t.riskScore) === 'Suspicious').length
    const safeCount = data.filter(t => getCalculatedStatus(t.riskScore) === 'Safe').length

    // True Positive: Correctly identified fraud
    const truePositive = fraudCount
    // False Positive: Flagged as suspicious but not fraud
    const falsePositive = suspiciousCount

    const truePositiveRate = ((truePositive / total) * 100).toFixed(1)
    const falsePositiveRate = ((falsePositive / total) * 100).toFixed(1)
    const accuracy = ((fraudCount + safeCount) / total * 100).toFixed(1)

    return {
      accuracy: parseFloat(accuracy),
      falsePositiveRate: parseFloat(falsePositiveRate),
      truePositiveRate: parseFloat(truePositiveRate)
    }
  }

  const metrics = calculateMetrics()

  const chartData = [
    { name: 'True Positive', value: metrics.truePositiveRate, color: '#10b981' },
    { name: 'False Positive', value: metrics.falsePositiveRate, color: '#f59e0b' },
    { name: 'Safe', value: (100 - metrics.truePositiveRate - metrics.falsePositiveRate).toFixed(1), color: '#64748b' }
  ]

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 shadow-xl">
        <p className="font-semibold text-white mb-1">{payload[0].name}</p>
        <p className="text-sm text-sky-400">{payload[0].value}%</p>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Detection Accuracy</h2>
        <p className="text-sm text-slate-300/80">Model performance metrics</p>
      </div>

      {data && data.length > 0 ? (
        <div className="flex flex-col lg:flex-row items-center justify-around gap-8">
          {/* Pie Chart */}
          <div className="flex flex-col items-center">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="text-center -mt-4">
              <p className="text-5xl font-bold text-white">{metrics.accuracy}%</p>
              <p className="text-sm text-slate-300/80 mt-1">Overall Accuracy</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="w-full lg:w-auto space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between gap-8">
                <span className="text-sm text-slate-300">False Positive Rate</span>
                <span className="text-2xl font-bold text-amber-400">{metrics.falsePositiveRate}%</span>
              </div>
              <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-amber-400 h-2 rounded-full transition-all" 
                  style={{ width: `${metrics.falsePositiveRate}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between gap-8">
                <span className="text-sm text-slate-300">True Positive Rate</span>
                <span className="text-2xl font-bold text-emerald-400">{metrics.truePositiveRate}%</span>
              </div>
              <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-emerald-400 h-2 rounded-full transition-all" 
                  style={{ width: `${metrics.truePositiveRate}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between gap-8">
                <span className="text-sm text-slate-300">Total Transactions</span>
                <span className="text-2xl font-bold text-sky-400">{data.length}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-400">No data available</p>
        </div>
      )}
    </div>
  )
}

export default DetectionAccuracy
