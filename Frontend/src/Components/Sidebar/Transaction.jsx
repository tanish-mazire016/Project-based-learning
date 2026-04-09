import React, { useEffect, useState } from 'react'
import { Filter, AlertTriangle } from 'lucide-react'
import AmountVsRiskScoreChart from './AmountVsRiskScoreChart'
import RiskScoreHistogram from './RiskScoreHistogram'
import TransactionStatusCard from './TransactionStatusCard'
import { useData } from './DataContext'

const Transactions = () => {
  const cardClass =
    'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ' +
    'shadow-[0_18px_45px_rgba(15,23,42,0.75)]'

  const { csvData, csvFileName } = useData()

  const [statusFilter, setStatusFilter] = useState('All Status')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [minRiskScore, setMinRiskScore] = useState('')
  const [maxRiskScore, setMaxRiskScore] = useState('')
  const [filteredTransactions, setFilteredTransactions] = useState([])

  // ✅ Function to calculate correct status based on risk score
  const getCalculatedStatus = (riskScore) => {
    if (riskScore >= 70) return 'Fraud'
    if (riskScore >= 40) return 'Suspicious'
    return 'Safe'
  }

  useEffect(() => {
    setFilteredTransactions(csvData)
  }, [csvData])

  const handleApplyFilters = () => {
    const minAmt = minAmount ? Number(minAmount) : -Infinity
    const maxAmt = maxAmount ? Number(maxAmount) : Infinity
    const minRisk = minRiskScore ? Number(minRiskScore) : -Infinity
    const maxRisk = maxRiskScore ? Number(maxRiskScore) : Infinity

    const filtered = csvData.filter((tx) => {
      const calculatedStatus = getCalculatedStatus(tx.riskScore)
      
      if (statusFilter !== 'All Status' && calculatedStatus !== statusFilter) return false
      if (tx.amount < minAmt || tx.amount > maxAmt) return false
      if (tx.riskScore < minRisk || tx.riskScore > maxRisk) return false
      return true
    })

    setFilteredTransactions(filtered)
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Safe':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'Suspicious':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'Fraud':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getRiskScoreColor = (score) => {
    if (score < 40) return 'bg-emerald-500'
    if (score < 70) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  const getRiskScoreIcon = (status) => {
    switch (status) {
      case 'Safe':
        return '○'
      case 'Suspicious':
        return '⚠'
      case 'Fraud':
        return '⊗'
      default:
        return '○'
    }
  }

  return (
    <div className="min-h-screen p-6 bg-linear-to-br from-slate-950 via-slate-900 to-sky-950">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
        <p className="text-slate-300">
          {csvFileName 
            ? `Showing data from: ${csvFileName}` 
            : 'Upload a CSV file in Overview to view transactions'}
        </p>
      </div>

      {/* Show message if no data uploaded */}
      {csvData.length === 0 && (
        <div className={`${cardClass} p-12 text-center mb-6`}>
          <p className="text-slate-400 text-lg mb-2">No transaction data available</p>
          <p className="text-slate-500 text-sm">Please upload a CSV file from the Overview page to view transactions</p>
        </div>
      )}

      {/* Show sections only if data exists */}
      {csvData.length > 0 && (
        <>
          {/* Warning about status calculation */}
          <div className="mb-6 bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-sky-200 font-medium">Status Calculation</p>
              <p className="text-xs text-sky-300/80 mt-1">
                Status badges are calculated from Risk Score: <span className="font-semibold">Safe (0-39)</span>, <span className="font-semibold">Suspicious (40-69)</span>, <span className="font-semibold">Fraud (70-100)</span>
              </p>
            </div>
          </div>

          {/* 1. Filters Section */}
          <div className={`${cardClass} p-6 mb-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-semibold text-white">Filters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-200 mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {['All Status', 'Safe', 'Suspicious', 'Fraud'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                          : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-white/10'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200 mb-2 block">Amount Range (₹)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200 mb-2 block">Risk Score (0-100)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minRiskScore}
                    onChange={(e) => setMinRiskScore(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxRiskScore}
                    onChange={(e) => setMaxRiskScore(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleApplyFilters}
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-md shadow-sky-500/40"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className={`${cardClass} overflow-hidden mb-6`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-white/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-200">Transaction ID</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-200">User</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-200">Amount</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-200">Location</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-200">Device</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-200">Risk Score</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-200">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-200">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredTransactions.map((transaction) => {
                    // ✅ Calculate correct status based on risk score
                    const calculatedStatus = getCalculatedStatus(transaction.riskScore)
                    
                    return (
                      <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sky-400 font-semibold text-sm">{transaction.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-white text-sm">{transaction.user.name}</div>
                            <div className="text-slate-400 text-xs">{transaction.user.userId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-white">
                            ₹{transaction.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300 text-sm">{transaction.location}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300 text-sm">{transaction.device}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-800 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getRiskScoreColor(transaction.riskScore)}`}
                                style={{ width: `${transaction.riskScore}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-slate-200">{transaction.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(
                              calculatedStatus
                            )}`}
                          >
                            <span>{getRiskScoreIcon(calculatedStatus)}</span>
                            {calculatedStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400 text-sm">{transaction.time}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredTransactions.length === 0 && csvData.length > 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400">No transactions match the current filters</p>
              </div>
            )}
          </div>

          {/* 2. TransactionStatusCard + RiskScoreHistogram (side by side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TransactionStatusCard data={filteredTransactions} />
            <RiskScoreHistogram data={filteredTransactions} />
          </div>

          {/* 3. AmountVsRiskScoreChart (full width at bottom) */}
          <AmountVsRiskScoreChart data={filteredTransactions} />
        </>
      )}
    </div>
  )
}

export default Transactions
