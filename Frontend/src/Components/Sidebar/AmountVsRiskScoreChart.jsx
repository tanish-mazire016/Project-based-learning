import React from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const AmountVsRiskScoreChart = ({ data }) => {
    const cardClass =
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ' +
        'shadow-[0_18px_45px_rgba(15,23,42,0.75)]'

    // ✅ Calculate correct status from risk score
    const getCalculatedStatus = (riskScore) => {
        if (riskScore >= 70) return 'Fraud'
        if (riskScore >= 40) return 'Suspicious'
        return 'Safe'
    }

    // Transform data for scatter plot
    // Uses: amount (x-axis) and risk_score (y-axis)
    const scatterData = data.map((tx) => ({
        amount: tx.amount,
        riskScore: tx.riskScore,
        status: getCalculatedStatus(tx.riskScore), // ✅ Calculate status
        id: tx.id
    }))

    // Color based on status
    const getColor = (status) => {
        switch (status) {
            case 'Safe':
                return '#10b981' // Green
            case 'Suspicious':
                return '#f59e0b' // Yellow
            case 'Fraud':
                return '#ef4444' // Red
            default:
                return '#64748b'
        }
    }

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null

        const data = payload[0].payload

        return (
            <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 shadow-xl">
                <p className="font-semibold text-white mb-2">{data.id}</p>
                <p className="text-sm text-sky-300">Amount: ₹{data.amount.toLocaleString()}</p>
                <p className="text-sm text-amber-300">Risk Score: {data.riskScore}</p>
                <p className="text-sm text-slate-300">Status: {data.status}</p>
            </div>
        )
    }

    return (
        <div className={`${cardClass} p-6`}>
            <div className="mb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span className="text-2xl">₹</span>
                            Amount vs Risk Score
                        </h2>
                        <p className="text-sm text-slate-300 mt-1">Graph Type: Scatter Plot</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Uses: <code className="bg-slate-800 px-2 py-0.5 rounded">amount</code> , <code className="bg-slate-800 px-2 py-0.5 rounded">risk_score</code>
                        </p>
                    </div>
                </div>

                {/* What it shows */}
                <div className="mt-4 bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-300 mb-2">What it shows:</p>
                    <ul className="text-xs text-slate-400 space-y-1">
                        <li>• High amount ≠ always fraud</li>
                        <li>• But high amount + high risk = red flag</li>
                        <li>• Status calculated from risk score: Safe (0-39), Suspicious (40-69), Fraud (70-100)</li>
                    </ul>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.35)" />
                    <XAxis
                        dataKey="amount"
                        name="Amount"
                        stroke="#e5e7eb"
                        style={{ fontSize: '12px' }}
                        tickLine={false}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                        dataKey="riskScore"
                        name="Risk Score"
                        stroke="#e5e7eb"
                        style={{ fontSize: '12px' }}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={scatterData} fill="#8884d8">
                        {scatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColor(entry.status)} opacity={0.7} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-300">Safe (0-39)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-slate-300">Suspicious (40-69)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-slate-300">Fraud (70-100)</span>
                </div>
            </div>
        </div>
    )
}

export default AmountVsRiskScoreChart
