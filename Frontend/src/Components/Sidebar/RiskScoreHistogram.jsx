import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const RiskScoreHistogram = ({ data }) => {
    const cardClass =
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ' +
        'shadow-[0_18px_45px_rgba(15,23,42,0.75)]'

    // Create histogram bins for risk scores
    // Uses: risk_score
    const createHistogramData = () => {
        const bins = [
            { range: '0-20', min: 0, max: 20, count: 0, color: '#10b981' },
            { range: '21-40', min: 21, max: 40, count: 0, color: '#84cc16' },
            { range: '41-60', min: 41, max: 60, count: 0, color: '#f59e0b' },
            { range: '61-80', min: 61, max: 80, count: 0, color: '#f97316' },
            { range: '81-100', min: 81, max: 100, count: 0, color: '#ef4444' }
        ]

        data.forEach((tx) => {
            const score = tx.riskScore
            const bin = bins.find((b) => score >= b.min && score <= b.max)
            if (bin) bin.count++
        })

        return bins
    }

    const histogramData = createHistogramData()

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null

        const data = payload[0].payload

        return (
            <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 shadow-xl">
                <p className="font-semibold text-white mb-1">Risk Score: {data.range}</p>
                <p className="text-sm text-sky-300">Transactions: {data.count}</p>
                <p className="text-xs text-slate-400 mt-1">
                    {((data.count / data.length) * 100).toFixed(1)}% of total
                </p>
            </div>
        )
    }

    return (
        <div className={`${cardClass} p-6`}>
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Risk Score Distribution</h2>
                <p className="text-sm text-slate-300 mt-1">Graph Type: Histogram / Bar Chart</p>
                <p className="text-xs text-slate-400 mt-1">
                    Uses: <code className="bg-slate-800 px-2 py-0.5 rounded">risk_score</code>
                </p>

                {/* What it shows */}
                <div className="mt-4 bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-300 mb-2">What it shows:</p>
                    <ul className="text-xs text-slate-400 space-y-1">
                        <li>• How transactions are spread across risk levels</li>
                        <li>• Clear separation of Safe / Suspicious / Fraud</li>
                    </ul>

                    <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-300 mb-1">Bonus:</p>
                        <p className="text-xs text-slate-400 mb-1">Color bars by:</p>
                        <ul className="text-xs text-slate-400 space-y-0.5 ml-2">
                            <li>• Green → Safe</li>
                            <li>• Yellow → Suspicious</li>
                            <li>• Red → Fraud</li>
                        </ul>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={histogramData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" vertical={false} />
                    <XAxis
                        dataKey="range"
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
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {histogramData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export default RiskScoreHistogram
