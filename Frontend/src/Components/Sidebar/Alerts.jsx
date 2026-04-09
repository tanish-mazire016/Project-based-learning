import React, { useState, useEffect } from 'react'
import { AlertTriangle, Search, Filter, Clock, MapPin, IndianRupeeIcon, Shield } from 'lucide-react'
import { useData } from './DataContext'

const Alerts = () => {
  const { csvData, csvFileName } = useData()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [alerts, setAlerts] = useState([])
  const [filteredAlerts, setFilteredAlerts] = useState([])

  // Generate alerts from CSV data (Suspicious and Fraud transactions)
  useEffect(() => {
    if (csvData.length === 0) {
      setAlerts([])
      setFilteredAlerts([])
      return
    }

    // Filter only Suspicious and Fraud transactions
    const alertTransactions = csvData.filter(
      (tx) => tx.status === 'Suspicious' || tx.status === 'Fraud'
    )

    // Convert to alert format
    const generatedAlerts = alertTransactions.map((tx, index) => {
      // Determine severity based on risk score
      let severity = 'Low'
      if (tx.riskScore >= 80) severity = 'Critical'
      else if (tx.riskScore >= 60) severity = 'High'
      else if (tx.riskScore >= 40) severity = 'Medium'

      // Determine alert status
      let alertStatus = 'Active'
      if (tx.status === 'Suspicious') {
        alertStatus = Math.random() > 0.5 ? 'Active' : 'Investigating'
      } else if (tx.status === 'Fraud') {
        alertStatus = Math.random() > 0.7 ? 'Active' : 'Resolved'
      }

      // Determine alert type
      let alertType = 'Suspicious Transaction'
      if (tx.status === 'Fraud') {
        if (tx.riskScore >= 80) alertType = 'Fraudulent Activity'
        else alertType = 'Confirmed Fraud'
      } else {
        if (tx.riskScore >= 60) alertType = 'Velocity Check Failed'
        else alertType = 'Location Anomaly'
      }

      // Generate description
      let description = `Transaction flagged as ${tx.status.toLowerCase()}`
      if (tx.riskScore >= 80) {
        description = 'Multiple risk indicators detected - immediate attention required'
      } else if (tx.riskScore >= 60) {
        description = 'Unusual transaction pattern detected from this account'
      } else {
        description = 'Transaction pattern differs from user history'
      }

      return {
        id: `ALT-${String(index + 1).padStart(3, '0')}`,
        type: alertType,
        severity,
        status: alertStatus,
        user: tx.user,
        transactionId: tx.id,
        amount: tx.amount,
        location: tx.location,
        device: tx.device,
        riskScore: tx.riskScore,
        timestamp: tx.time,
        description,
        originalTransaction: tx
      }
    })

    // Sort by risk score (highest first)
    generatedAlerts.sort((a, b) => b.riskScore - a.riskScore)

    setAlerts(generatedAlerts)
    setFilteredAlerts(generatedAlerts)
  }, [csvData])

  // Calculate stats
  const stats = {
    total: filteredAlerts.length,
    active: filteredAlerts.filter(a => a.status === 'Active').length,
    investigating: filteredAlerts.filter(a => a.status === 'Investigating').length,
    resolved: filteredAlerts.filter(a => a.status === 'Resolved').length
  }

  // Search and filter logic
  useEffect(() => {
    let filtered = [...alerts]

    // Apply search
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (alert) =>
          alert.id.toLowerCase().includes(query) ||
          alert.user.name.toLowerCase().includes(query) ||
          alert.user.userId.toLowerCase().includes(query) ||
          alert.type.toLowerCase().includes(query) ||
          alert.transactionId.toLowerCase().includes(query)
      )
    }

    // Apply severity filter
    if (severityFilter !== 'All') {
      filtered = filtered.filter((alert) => alert.severity === severityFilter)
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((alert) => alert.status === statusFilter)
    }

    setFilteredAlerts(filtered)
  }, [searchQuery, severityFilter, statusFilter, alerts])

  const handleFilterApply = () => {
    console.log('Filters applied:', { severityFilter, statusFilter })
  }

  // Helper functions
  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      case 'High':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'Medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'Low':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      case 'Investigating':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30'
      case 'Resolved':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'Critical':
        return '🔴'
      case 'High':
        return '🟠'
      case 'Medium':
        return '🟡'
      case 'Low':
        return '🟢'
      default:
        return '⚪'
    }
  }

  const cardClass =
    'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ' +
    'shadow-[0_18px_45px_rgba(15,23,42,0.75)]'

  return (
    <div className="min-h-screen px-6 py-6 bg-linear-to-br from-slate-950 via-slate-900 to-sky-950">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Alerts</h1>
        <p className="text-slate-300">
          {csvFileName
            ? `Monitoring alerts from: ${csvFileName}`
            : 'Upload a CSV file in Overview to view alerts'}
        </p>
      </div>

      {/* Show message if no data */}
      {csvData.length === 0 && (
        <div className={`${cardClass} p-12 text-center`}>
          <AlertTriangle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg mb-2">No alerts available</p>
          <p className="text-slate-500 text-sm">Please upload a CSV file from the Overview page</p>
        </div>
      )}

      {/* Show alerts if data exists */}
      {csvData.length > 0 && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`${cardClass} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300 mb-1">Total Alerts</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-sky-400" />
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300 mb-1">Active</p>
                  <p className="text-2xl font-bold text-rose-400">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-rose-400" />
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300 mb-1">Investigating</p>
                  <p className="text-2xl font-bold text-sky-400">{stats.investigating}</p>
                </div>
                <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-sky-400" />
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300 mb-1">Resolved</p>
                  <p className="text-2xl font-bold text-emerald-400">{stats.resolved}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className={`${cardClass} p-6 mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="text-sm font-medium text-slate-200 mb-2 block">
                  Search Alerts
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by ID, user, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 pl-10 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-slate-100
                         placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200 mb-2 block">
                  Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200 mb-2 block">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={handleFilterApply}
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-2 rounded-lg
                     transition-colors flex items-center gap-2 shadow-md shadow-sky-500/30"
              >
                <Filter className="w-4 h-4" />
                Apply Filters
              </button>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`${cardClass} p-6 hover:shadow-[0_20px_55px_rgba(15,23,42,0.9)] transition-shadow`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center
                  ${
                    alert.severity === 'Critical'
                      ? 'bg-rose-500/20'
                      : alert.severity === 'High'
                      ? 'bg-orange-500/20'
                      : alert.severity === 'Medium'
                      ? 'bg-amber-500/20'
                      : 'bg-emerald-500/20'
                  }`}
                    >
                      <AlertTriangle
                        className={`w-6 h-6
                    ${
                      alert.severity === 'Critical'
                        ? 'text-rose-400'
                        : alert.severity === 'High'
                        ? 'text-orange-400'
                        : alert.severity === 'Medium'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">{alert.type}</h3>
                            <span className="text-sm text-slate-400">#{alert.id}</span>
                          </div>
                          <p className="text-sm text-slate-300">{alert.description}</p>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">User</p>
                          <p className="text-sm font-medium text-white">{alert.user.name}</p>
                          <p className="text-xs text-slate-400">{alert.user.userId}</p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400 mb-1">Transaction</p>
                          <p className="text-sm font-medium text-sky-400">{alert.transactionId}</p>
                          <p className="text-xs text-slate-200 font-semibold flex items-center gap-1">
                            <IndianRupeeIcon className="w-3 h-3" />
                            {alert.amount.toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400 mb-1">Location & Device</p>
                          <div className="flex items-center gap-1 text-sm text-slate-200">
                            <MapPin className="w-3 h-3" />
                            <span className="text-xs">{alert.location}</span>
                          </div>
                          <p className="text-xs text-slate-400">{alert.device}</p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400 mb-1">Risk Score</p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-800 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full
                            ${
                              alert.riskScore >= 70
                                ? 'bg-rose-500'
                                : alert.riskScore >= 40
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                                style={{ width: `${alert.riskScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-white">{alert.riskScore}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badges + Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border
                        ${getSeverityStyle(alert.severity)}`}
                          >
                            <span>{getSeverityIcon(alert.severity)}</span>
                            {alert.severity}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border
                        ${getStatusStyle(alert.status)}`}
                          >
                            {alert.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span>{alert.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4 min-w-[130px]">
                    <button className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-sky-500/40">
                      Investigate
                    </button>
                    <button className="px-4 py-2 bg-slate-900/70 hover:bg-slate-800 text-slate-100 text-sm font-medium rounded-lg transition-colors border border-white/10">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state if no filtered alerts */}
          {filteredAlerts.length === 0 && alerts.length > 0 && (
            <div className={`${cardClass} p-12 text-center mt-6 flex flex-col items-center`}>
              <Search className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-300 text-lg mb-2">No alerts match your filters</p>
              <p className="text-slate-500 text-sm">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {/* Empty state if no suspicious/fraud transactions */}
          {alerts.length === 0 && csvData.length > 0 && (
            <div className={`${cardClass} p-12 text-center mt-6 flex flex-col items-center`}>
              <Shield className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-300 text-lg mb-2">All Clear!</p>
              <p className="text-slate-500 text-sm">No suspicious or fraudulent transactions detected</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Alerts
