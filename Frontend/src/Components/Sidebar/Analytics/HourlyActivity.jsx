import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getHourlyActivity } from '../../../api/client'

const HourlyActivity = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false

        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const result = await getHourlyActivity()
                if (!cancelled) setData(result)
            } catch (err) {
                console.error('Failed to fetch hourly activity:', err)
                if (!cancelled) setError('Failed to load hourly data')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchData()
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchData, 60000)

        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [])

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null

        return (
            <div className="rounded-lg bg-white border border-gray-200 px-4 py-3 shadow-lg">
                <p className="font-semibold text-gray-900 mb-2">{label}:00</p>
                <p className="text-sm text-blue-600">Transactions: {payload[0]?.value}</p>
                <p className="text-sm text-red-600">Frauds: {payload[1]?.value}</p>
            </div>
        )
    }

    // use this Tailwind class string for all cards
    const cardClass =
        "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/95 " +
        "shadow-[0_18px_45px_rgba(15,23,42,0.75)] p-6";

    if (loading && data.length === 0) {
        return (
            <div className={cardClass}>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white">Hourly Activity Pattern</h2>
                    <p className="text-sm text-slate-300/80">Loading data...</p>
                </div>
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-slate-400 text-sm">Loading hourly activity...</div>
                </div>
            </div>
        )
    }

    if (error && data.length === 0) {
        return (
            <div className={cardClass}>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white">Hourly Activity Pattern</h2>
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className={cardClass}>
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">
                    Hourly Activity Pattern
                </h2>
                <p className="text-sm text-slate-300/80">
                    Transaction and fraud distribution by hour
                </p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <defs>
                        <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFrauds" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97373" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f97373" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        stroke="#e5e7eb"
                        style={{ fontSize: '12px' }}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#e5e7eb"
                        style={{ fontSize: '12px' }}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="transactions"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fill="url(#colorTransactions)"
                    />
                    <Area
                        type="monotone"
                        dataKey="frauds"
                        stroke="#f97373"
                        strokeWidth={2}
                        fill="url(#colorFrauds)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );

}

export default HourlyActivity
