import React, { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { useData } from './DataContext'
import FraudTrendChart from './Analytics/FraudTrendChart'
import DetectionAccuracy from './Analytics/DetectionAccuracy'
import RiskScoreDistribution from './Analytics/RiskScoreDistribution'
import TopFraudTypes from './Analytics/TopFraudTypes'
import TransactionsByRegion from './Analytics/TransactionsByRegion'
import { filterByDateRange } from '../../DateUtils'

const Analytics = () => {
  const { csvData, csvFileName } = useData()
  const [dateRange, setDateRange] = useState('all')
  const [filteredData, setFilteredData] = useState([])

  const cardClass =
    'rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/95 ' +
    'shadow-[0_18px_45px_rgba(15,23,42,0.75)] p-6'

  // Filter data based on date range selection
  useEffect(() => {
    if (csvData.length === 0) {
      setFilteredData([])
      return
    }

    const now = new Date()
    let startDate = null

    switch (dateRange) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '6months':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        setFilteredData(csvData)
        return
    }

    const filtered = filterByDateRange(csvData, startDate, now)
    setFilteredData(filtered)
  }, [dateRange, csvData])

  const handleExportReport = () => {
    const stats = {
      totalTransactions: filteredData.length,
      fraudCount: filteredData.filter(t => t.status === 'Fraud').length,
      suspiciousCount: filteredData.filter(t => t.status === 'Suspicious').length,
      safeCount: filteredData.filter(t => t.status === 'Safe').length,
      totalAmount: filteredData.reduce((sum, t) => sum + t.amount, 0),
      fraudAmount: filteredData.filter(t => t.status === 'Fraud').reduce((sum, t) => sum + t.amount, 0)
    }

    const reportContent = `
FRAUD DETECTION ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
Data Source: ${csvFileName || 'N/A'}
Date Range: ${dateRange === 'all' ? 'All Time' : dateRange.replace('days', ' Days').replace('months', ' Months').replace('year', ' Year')}

==============================================

SUMMARY STATISTICS
--------------
Total Transactions: ${stats.totalTransactions}
Safe Transactions: ${stats.safeCount}
Suspicious Transactions: ${stats.suspiciousCount}
Fraud Transactions: ${stats.fraudCount}
Fraud Rate: ${stats.totalTransactions > 0 ? ((stats.fraudCount / stats.totalTransactions) * 100).toFixed(2) : 0}%

FINANCIAL IMPACT
--------------
Total Transaction Amount: ₹${stats.totalAmount.toLocaleString()}
Fraud Amount Blocked: ₹${stats.fraudAmount.toLocaleString()}
Fraud Percentage: ${stats.totalAmount > 0 ? ((stats.fraudAmount / stats.totalAmount) * 100).toFixed(2) : 0}%

==============================================
    `

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fraud_analytics_report_${dateRange}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen px-6 py-6 bg-linear-to-br from-slate-950 via-slate-900 to-sky-950">
      {/* Header with Filter and Export */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-slate-300">
            {csvFileName
              ? `Analyzing data from: ${csvFileName}`
              : 'Upload a CSV file in Overview to view analytics'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 text-sm font-medium
                     focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent cursor-pointer
                     hover:bg-slate-800/80 transition-colors"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportReport}
            disabled={filteredData.length === 0}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all
              ${filteredData.length > 0
                ? 'border-sky-500/60 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20 shadow-md shadow-sky-500/30'
                : 'border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed'
              }`}
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Show message if no data */}
      {csvData.length === 0 && (
        <div className={`${cardClass} text-center py-12`}>
          <p className="text-slate-400 text-lg mb-2">No data available</p>
          <p className="text-slate-500 text-sm">Please upload a CSV file from the Overview page</p>
        </div>
      )}

      {/* Charts Grid - Show only when data exists */}
      {csvData.length > 0 && (
        <div className="space-y-6">
          {/* Fraud Detection Trend - Full Width */}
          <div className="w-full">
            <FraudTrendChart data={filteredData} dateRange={dateRange} />
          </div>

          {/* Detection Accuracy - Full Width */}
          <div className="w-full">
            <DetectionAccuracy data={filteredData} />
          </div>

          {/* Risk Score Distribution and Top Fraud Types - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskScoreDistribution data={filteredData} />
            <TopFraudTypes data={filteredData} />
          </div>

          {/* Transactions by Region - Full Width */}
          <div className="w-full">
            <TransactionsByRegion data={filteredData} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics
