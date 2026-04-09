import React from 'react'
import { IndianRupeeIcon, AlertTriangle, ShieldCheck, TrendingUp, Upload, FileSpreadsheet } from 'lucide-react'
import { useData } from './DataContext'

const Overview = () => {
  const { csvData, csvFileName, handleFileUpload } = useData()

  const cardClass =
    'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ' +
    'shadow-[0_18px_45px_rgba(15,23,42,0.75)] hover:shadow-[0_20px_55px_rgba(15,23,42,0.9)] transition-shadow'

  // Handle CSV file selection
  const handleCsvChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Calculate stats from uploaded CSV data
  const calculateStats = () => {
    if (csvData.length === 0) {
      return {
        total: 0,
        fraudCount: 0,
        suspiciousCount: 0,
        fraudRate: 0,
        amountBlocked: 0
      }
    }

    const total = csvData.length
    const fraudCount = csvData.filter(t => t.status === 'Fraud').length
    const suspiciousCount = csvData.filter(t => t.status === 'Suspicious').length
    const fraudRate = ((fraudCount / total) * 100).toFixed(2)
    const amountBlocked = csvData
      .filter(t => t.status === 'Fraud')
      .reduce((sum, t) => sum + t.amount, 0)

    return { total, fraudCount, suspiciousCount, fraudRate, amountBlocked }
  }

  const calculatedStats = calculateStats()

  const stats = [
    {
      title: 'Total Transactions',
      value: calculatedStats.total.toLocaleString(),
      change: '+12.5%',
      changeType: 'positive',
      icon: IndianRupeeIcon,
      iconBg: 'bg-sky-500/20',
      iconColor: 'text-sky-400'
    },
    {
      title: 'Fraud Detected',
      value: calculatedStats.fraudCount.toString(),
      change: '-8.2%',
      changeType: 'positive',
      icon: AlertTriangle,
      iconBg: 'bg-rose-500/20',
      iconColor: 'text-rose-400'
    },
    {
      title: 'Fraud Rate',
      value: `${calculatedStats.fraudRate}%`,
      change: '-0.05%',
      changeType: 'positive',
      icon: ShieldCheck,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400'
    },
    {
      title: 'Amount Blocked',
      value: `₹${calculatedStats.amountBlocked.toLocaleString()}`,
      change: '+15.3%',
      changeType: 'positive',
      icon: TrendingUp,
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-400'
    }
  ]

  return (
    <div className="min-h-screen p-6 bg-linear-to-br from-slate-950 via-slate-900 to-sky-950">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
          <p className="text-slate-300">Monitor fraud detection in real-time</p>
        </div>

        {/* CSV Upload Panel */}
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 flex items-center gap-3 shadow-[0_14px_35px_rgba(15,23,42,0.8)]">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-300 uppercase tracking-wide">Data Source</span>
              <span className="text-sm font-medium text-white line-clamp-1">
                {csvFileName || 'No CSV file selected'}
              </span>
            </div>
          </div>

          <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/20 transition-all shadow-md shadow-sky-500/30">
            <Upload className="w-4 h-4" />
            <span>Upload CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvChange}
              className="hidden"   
            />
          </label>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className={cardClass}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} strokeWidth={2} />
                </div>
                <span
                  className={`text-sm font-semibold ${
                    stat.changeType === 'positive' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {stat.change}
                </span>
              </div>

              <h3 className="text-slate-300 text-sm font-medium mb-2">{stat.title}</h3>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Insights / Summary section */}
      <div className={cardClass}>
        <div className="p-6 flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">Insights from Recent Activity</h2>
            <p className="text-sm text-slate-300 mb-4">
              These high-level insights help analysts understand overall system behaviour before deep-diving into detailed analytics.
            </p>

            <ul className="space-y-3 text-sm text-slate-200">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Detection accuracy remains above <span className="font-semibold">99%</span> with a declining fraud rate, indicating strong model performance.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span>
                  Transaction volume is trending up, so analysts should keep an eye on peak-hour patterns in the Analytics and Transactions pages.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>
                  Suspicious but non-fraudulent cases are a good target for rule tuning to reduce manual review workload.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
                <span>
                  {csvData.length > 0 
                    ? `Uploaded dataset contains ${csvData.length} transactions with ${calculatedStats.fraudCount} fraud cases detected.`
                    : 'Upload a CSV file to see dynamic insights about your transaction data.'}
                </span>
              </li>
            </ul>
          </div>

          {/* CSV Snapshot */}
          <div className="w-full lg:w-64 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
              CSV Snapshot
            </p>
            <div className="space-y-3 text-sm text-slate-200">
              <div className="flex justify-between">
                <span>Total rows</span>
                <span className="font-semibold">
                  {csvData.length || '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Safe</span>
                <span className="font-semibold text-emerald-400">
                  {csvData.length > 0 ? csvData.filter(t => t.status === 'Safe').length : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Suspicious</span>
                <span className="font-semibold text-amber-400">
                  {csvData.length > 0 ? csvData.filter(t => t.status === 'Suspicious').length : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fraud</span>
                <span className="font-semibold text-rose-400">
                  {csvData.length > 0 ? calculatedStats.fraudCount : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last upload</span>
                <span className="font-semibold">
                  {csvFileName ? 'Just now' : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview
