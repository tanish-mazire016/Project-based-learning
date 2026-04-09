import React from 'react'

const TransactionStatusCard = ({ data }) => {
  const cardClass =
    'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ' +
    'shadow-[0_18px_45px_rgba(15,23,42,0.75)]'

  // ✅ Calculate correct status from risk score
  const getCalculatedStatus = (riskScore) => {
    if (riskScore >= 70) return 'Fraud'
    if (riskScore >= 40) return 'Suspicious'
    return 'Safe'
  }

  // Calculate status distribution from actual data
  const calculateStats = () => {
    if (!data || data.length === 0) {
      return {
        safe: { count: 0, percentage: 0 },
        suspicious: { count: 0, percentage: 0 },
        fraud: { count: 0, percentage: 0 }
      }
    }

    const total = data.length
    // ✅ Use calculated status instead of CSV status
    const safeCount = data.filter(t => getCalculatedStatus(t.riskScore) === 'Safe').length
    const suspiciousCount = data.filter(t => getCalculatedStatus(t.riskScore) === 'Suspicious').length
    const fraudCount = data.filter(t => getCalculatedStatus(t.riskScore) === 'Fraud').length

    return {
      safe: {
        count: safeCount,
        percentage: ((safeCount / total) * 100).toFixed(1)
      },
      suspicious: {
        count: suspiciousCount,
        percentage: ((suspiciousCount / total) * 100).toFixed(1)
      },
      fraud: {
        count: fraudCount,
        percentage: ((fraudCount / total) * 100).toFixed(1)
      }
    }
  }

  const statusStats = calculateStats()

  return (
    <div className={`${cardClass} p-6`}>
      <h2 className="text-lg font-semibold text-white mb-1">Transaction Status</h2>
      <p className="text-sm text-slate-300 mb-6">Distribution by risk classification</p>

      <div className="space-y-5">
        {/* Safe */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            <span className="text-slate-200 font-medium">Safe</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-white">{statusStats.safe.count.toLocaleString()}</div>
            <div className="text-sm text-slate-400">({statusStats.safe.percentage}%)</div>
          </div>
        </div>

        {/* Suspicious */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <span className="text-slate-200 font-medium">Suspicious</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-white">{statusStats.suspicious.count.toLocaleString()}</div>
            <div className="text-sm text-slate-400">({statusStats.suspicious.percentage}%)</div>
          </div>
        </div>

        {/* Fraud */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-400"></div>
            <span className="text-slate-200 font-medium">Fraud</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-white">{statusStats.fraud.count.toLocaleString()}</div>
            <div className="text-sm text-slate-400">({statusStats.fraud.percentage}%)</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionStatusCard
