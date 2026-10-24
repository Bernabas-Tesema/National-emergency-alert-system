import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Sparkles,
  Smartphone,
  MessageSquare,
  PhoneCall,
  Users,
  FileCheck,
  AlertOctagon,
} from 'lucide-react'

import { createAlertDraft, submitTier1, type AlertSeverity, type AlertChannel } from '@/api/mockAlerts'
import { MapPicker, type GeoJsonFeature } from '@/packages/ui/MapPicker'
import { useAuth } from '@/features/auth/useAuth'

const TEMPLATES = [
  {
    title: 'Flash Flood Evacuation Notice',
    severity: 'critical',
    en: 'EMERGENCY: Rapid flood waters approaching. Move to designated high ground immediately. Avoid all flooded road crossings.',
    am: 'አስቸኳይ ማስጠንቀቂያ፡ የጎርፍ ውሃ በከፍተኛ ፍጥነት እየጨመረ በመሆኑ ወዲያውኑ ወደ ከፍታ ቦታዎች ይሸሹ። የተጥለቀለቁ መንገዶችን አይሻገሩ።',
  },
  {
    title: 'Severe Wildfire Evacuation Advisory',
    severity: 'high',
    en: 'HIGH ALERT: Wildfire approaching settlement boundaries. Prepare emergency evacuation bags and follow civil defense routes.',
    am: 'ከፍተኛ ማስጠንቀቂያ፡ የሰደድ እሳት ወደ መንደሩ እየተቃረበ በመሆኑ የአስቸኳይ ጊዜ ሻንጣዎችን አዘጋጁና የአደጋ ጊዜ መንገዶችን ተከተሉ።',
  },
  {
    title: 'Hazardous Chemical Airborne Advisory',
    severity: 'critical',
    en: 'CRITICAL: Industrial chemical plume hazard. Remain indoors, seal doors and windows, shut down ventilation systems.',
    am: 'አደገኛ፡ የኬሚካል ጋዝ በአየር ላይ በመሰራጨቱ ቤት ውስጥ ይቆዩ፣ መስኮቶችንና በሮችን ይዝጉ፣ አየር ማናፈሻዎችን ያጥፉ።',
  },
]

export default function AlertComposerPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('URGENT: Flash Flood Emergency Warning')
  const [severity, setSeverity] = useState<AlertSeverity>('critical')
  const [targetArea, setTargetArea] = useState('Oromia - East Shewa (Adama, Mojo corridor)')
  const [mapGeo, setMapGeo] = useState<GeoJsonFeature | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<AlertChannel[]>(['push', 'sms'])
  const [activeLang, setActiveLang] = useState<'en' | 'am' | 'om'>('en')

  const [textEn, setTextEn] = useState(
    'EMERGENCY ALERT: Rapidly rising river levels in Awash basin. Residents in low-lying zones must evacuate immediately to higher ground.',
  )
  const [textAm, setTextAm] = useState(
    'አስቸኳይ ማስጠንቀቂያ፡ በአዋሽ ተፋሰስ የውሃ ሙላት በመከሰቱ ዝቅተኛ ቦታዎች የሚኖሩ ዜጎች ወዲያውኑ ወደ ከፍታ ቦታዎች ይሸሹ።',
  )
  const [textOm, setTextOm] = useState(
    'AKEEKKACHIISA HATATTAMAA: Loolaan laggeen Awaash keessatti waan dabaleef uummanni gara bakka olka\'aatti akka baqatu gaafanna.',
  )

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [aiDrafting, setAiDrafting] = useState(false)

  // SMS character counter & segments
  const activeText = activeLang === 'en' ? textEn : activeLang === 'am' ? textAm : textOm
  const charLimit = activeLang === 'en' ? 160 : 70 // Unicode SMS segment limit
  const charCount = activeText.length
  const segmentCount = Math.ceil(charCount / charLimit) || 1

  // Audience reach calculation
  const audienceEstimate = 142000

  async function handleSubmitTier1() {
    if (!user) return
    setBusy(true)
    setError('')
    try {
      const draft = await createAlertDraft(
        {
          title,
          severity,
          area: targetArea,
          channels: selectedChannels,
          languages: { en: textEn, am: textAm, om: textOm },
          estimatedCitizens: audienceEstimate,
        },
        user,
      )
      await submitTier1(draft.id, user)
      navigate('/insa/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the alert.')
    } finally {
      setBusy(false)
    }
  }

  function handleAiDraft() {
    setAiDrafting(true)
    setTimeout(() => {
      setTextEn(
        `OFFICIAL INSA WARNING: ${severity.toUpperCase()} hazard detected in ${targetArea}. Public safety protocols are activated. Follow instructions from local emergency personnel immediately.`,
      )
      setTextAm(
        `ይፋዊ የኢንሳ ማስጠንቀቂያ፡ በ${targetArea} አደገኛ ሁኔታ ተከስቷል። የደህንነት መመሪያዎችን ተግባራዊ ያድርጉና የአካባቢውን የድንገተኛ አደጋ መመሪያዎችን ይከተሉ።`,
      )
      setAiDrafting(false)
    }, 800)
  }

  const toggleChannel = (ch: AlertChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Eyebrow & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b2e34] pb-4">
        <div>
          <p className="text-[11px] font-bold text-teal-400 tracking-widest uppercase">
            National Public Warning Broadcast
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            Emergency Alert Composer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Author multi-channel, multi-lingual emergency bulletins and submit for Tier-2 Higher Officer signature.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-800 bg-red-950/70 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmitTier1}
          disabled={busy || selectedChannels.length === 0}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-500 transition-colors shadow-lg disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4" />
          <span>Submit for Tier-2 Approval</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Headline & Severity */}
          <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 space-y-4 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Alert Headline</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                  className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="critical">Critical (Life Threatening)</option>
                  <option value="high">High (Severe Impact)</option>
                  <option value="medium">Medium (Moderate Warning)</option>
                  <option value="low">Low (Advisory Notice)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Estimated Audience</label>
                <div className="flex items-center gap-2 rounded-lg bg-[#0c1417] border border-[#1b2e34] px-3.5 py-2 text-xs text-teal-300 font-mono">
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  <span>~{audienceEstimate.toLocaleString()} citizens reached</span>
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast Channels */}
          <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 space-y-3 shadow-sm">
            <label className="block text-xs font-medium text-slate-300">Target Dissemination Channels</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'push', label: 'Push Notification', icon: Smartphone, desc: 'EthioAlert mobile app' },
                { id: 'sms', label: 'Cell Broadcast / SMS', icon: MessageSquare, desc: 'Telecom tower blast' },
                { id: 'voice', label: 'IVR Voice Blast', icon: PhoneCall, desc: 'Automated robocall' },
              ].map((ch) => {
                const active = selectedChannels.includes(ch.id as AlertChannel)
                const Icon = ch.icon
                return (
                  <div
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id as AlertChannel)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      active
                        ? 'border-teal-500/60 bg-[#133e42]/40 text-teal-300 shadow-sm'
                        : 'border-[#1b2e34] bg-[#0c1417] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1.5 text-teal-400" />
                    <p className="text-xs font-semibold text-slate-200">{ch.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{ch.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Area Target MapPicker */}
          <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Geographic Targeting (MapPicker)</label>
              <span className="text-xs text-teal-400 font-mono">{targetArea}</span>
            </div>
            <MapPicker
              value={mapGeo}
              onChange={(g) => {
                setMapGeo(g)
                const r = g.properties.regionRef
                setTargetArea(`${r.region}${r.subcity ? ` - ${r.subcity}` : ''}`)
              }}
              height="280px"
            />
          </div>

          {/* Message Content & Languages */}
          <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {['en', 'am', 'om'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang as any)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeLang === lang
                        ? 'bg-[#133e42] text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'am' ? 'Amharic (አማርኛ)' : 'Afaan Oromoo'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAiDraft}
                disabled={aiDrafting}
                className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiDrafting ? 'Drafting...' : 'AI Generate Text'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={activeLang === 'en' ? textEn : activeLang === 'am' ? textAm : textOm}
              onChange={(e) => {
                if (activeLang === 'en') setTextEn(e.target.value)
                else if (activeLang === 'am') setTextAm(e.target.value)
                else setTextOm(e.target.value)
              }}
              className="w-full rounded-lg bg-[#0c1417] border border-[#1b2e34] p-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Length: <strong className="text-slate-200">{charCount}</strong> chars ({segmentCount} SMS segment{segmentCount > 1 ? 's' : ''})
              </span>
              <span>Identity protection: Citizens receive anonymized alert without identifiers</span>
            </div>
          </div>
        </div>

        {/* Right Column: Previews per channel & Quick Templates */}
        <div className="lg:col-span-5 space-y-5">
          {/* Templates list */}
          <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 space-y-3 shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Standard Emergency Templates
            </h4>
            <div className="space-y-2">
              {TEMPLATES.map((tmpl, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setTitle(tmpl.title)
                    setSeverity(tmpl.severity as any)
                    setTextEn(tmpl.en)
                    setTextAm(tmpl.am)
                  }}
                  className="p-3 rounded-lg border border-[#1b2e34] bg-[#0c1417] hover:border-teal-500/50 hover:bg-[#152327] cursor-pointer transition-colors"
                >
                  <p className="text-xs font-semibold text-slate-200">{tmpl.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{tmpl.en}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Mobile Device Channel Preview */}
          <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-5 space-y-3 shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Citizen Handset Live Preview
            </h4>

            {/* Mobile Handset Mock Frame */}
            <div className="mx-auto max-w-[280px] rounded-2xl border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl">
              <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto mb-4" />

              {/* Push notification card */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold uppercase">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
                  <span>EthioAlert &bull; National Emergency</span>
                </div>
                <p className="text-xs font-bold text-white leading-tight">{title}</p>
                <p className="text-[11px] text-slate-300 leading-snug">{activeText}</p>
              </div>

              <div className="mt-4 text-center text-[10px] text-slate-500">
                Cell Broadcast &bull; All Handsets
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
