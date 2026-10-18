import { useState } from 'react'
import {
  TrendingUp,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'

export default function ReportsAnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')
  const [exporting, setExporting] = useState(false)

  const handleExport = (format: 'pdf' | 'csv') => {
    setExporting(true)
    setTimeout(() => {
      setExporting(false)
      alert(`Report successfully generated and exported in ${format.toUpperCase()} format.`)
    }, 700)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Eyebrow & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b2e34] pb-4">
        <div>
          <p className="text-[11px] font-bold text-teal-400 tracking-widest uppercase">
            Performance & Operational Analytics
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            National Emergency Analytics & Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical alert response times, partner organization reporting SLA performance, and multi-channel telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg bg-[#111d21] border border-[#1b2e34] px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
            <option value="90d">Past Quarter</option>
            <option value="1y">Past Year</option>
          </select>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg border border-[#1b2e34] bg-[#111d21] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-[#162327] transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel / CSV</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Executive PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-400">Mean Triage-to-Broadcast Time</span>
          <p className="text-3xl font-mono font-bold text-teal-400 mt-2">7m 42s</p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>18% faster than baseline</span>
          </p>
        </div>

        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-400">Total Alerts Disseminated</span>
          <p className="text-3xl font-mono font-bold text-white mt-2">48</p>
          <p className="text-[11px] text-slate-400 mt-1">100% Tier-2 dual authorized</p>
        </div>

        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-400">Citizen Reach Success Rate</span>
          <p className="text-3xl font-mono font-bold text-emerald-400 mt-2">97.8%</p>
          <p className="text-[11px] text-slate-400 mt-1">Across 3 regional telecom carriers</p>
        </div>

        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-400">Total SOS Incidents Resolved</span>
          <p className="text-3xl font-mono font-bold text-sky-400 mt-2">324</p>
          <p className="text-[11px] text-slate-400 mt-1">Average dispatch time: 4m 10s</p>
        </div>
      </div>

      {/* Analytics Breakdown Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner Organization Submission Performance */}
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Partner Organization Reporting Compliance
          </h3>

          <div className="space-y-4">
            {[
              { name: 'Fire & Emergency Authority (Addis Ababa)', cases: 28, verified: 26, rate: 93 },
              { name: 'National Meteorological Institute', cases: 14, verified: 14, rate: 100 },
              { name: 'Ethiopian Disaster Risk Commission', cases: 19, verified: 17, rate: 89 },
              { name: 'Oromia Regional Emergency Police', cases: 11, verified: 9, rate: 82 },
            ].map((org, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">{org.name}</span>
                  <span className="font-mono text-teal-400 font-bold">{org.rate}% Verified</span>
                </div>
                <div className="w-full bg-[#162327] rounded-full h-2 overflow-hidden border border-[#1b2e34]">
                  <div
                    className="bg-teal-500 h-full rounded-full"
                    style={{ width: `${org.rate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{org.cases} incidents reported</span>
                  <span>{org.verified} approved for broadcast</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Reach Performance */}
        <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Dissemination Channel Delivery Ratios
          </h3>

          <div className="space-y-4">
            {[
              { channel: 'Cell Broadcast / SMS', sent: '1,420,000', delivered: '98.2%', latency: '2.4s', color: 'bg-teal-500' },
              { channel: 'EthioAlert Mobile App Push', sent: '680,000', delivered: '99.4%', latency: '0.8s', color: 'bg-sky-500' },
              { channel: 'Automated IVR Voice Robocalls', sent: '145,000', delivered: '91.6%', latency: '6.2s', color: 'bg-amber-500' },
            ].map((ch, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-[#0c1417] border border-[#1b2e34] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{ch.channel}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{ch.delivered} Delivered</span>
                </div>
                <div className="grid grid-cols-2 text-[11px] text-slate-400">
                  <span>Volume: <strong className="text-slate-300 font-mono">{ch.sent}</strong></span>
                  <span>Avg Latency: <strong className="text-slate-300 font-mono">{ch.latency}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
