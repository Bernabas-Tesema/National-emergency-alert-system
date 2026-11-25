import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import {
  Siren,
  MapPin,
  Navigation,
  Camera,
  User,
  Phone,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Users,
  Info,
  FileText,
  ChevronRight,
} from 'lucide-react'

import {
  SOS_EMERGENCY_TYPES,
  SOS_TYPE_META,
  EMPTY_SOS_SUBMISSION,
  type SosSubmission,
  type SosEmergencyType,
} from './types'
import { submitSosReport } from './sosApi'

const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Oromia',
  'Amhara',
  'Tigray',
  'Sidama',
  'Dire Dawa',
  'Somali',
  'Afar',
  'Harari',
  'Benishangul-Gumuz',
  'Gambela',
  'Central Ethiopia',
  'South Ethiopia',
]

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 'type', label: 'Emergency Type', icon: Siren },
  { id: 'details', label: 'What Happened', icon: FileText },
  { id: 'location', label: 'Your Location', icon: MapPin },
  { id: 'photo', label: 'Photo Evidence', icon: Camera },
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'review', label: 'Review & Send', icon: CheckCircle2 },
]

export default function SosSubmitPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<SosSubmission>(EMPTY_SOS_SUBMISSION)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = useCallback(<K extends keyof SosSubmission>(key: K, val: SosSubmission[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }, [])

  // ── GPS ───────────────────────────────────────────────────────────────────
  function requestGps() {
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device.')
      return
    }
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('gpsLat', pos.coords.latitude)
        update('gpsLng', pos.coords.longitude)
        update('gpsAccuracy', pos.coords.accuracy)
        update('locationPermitted', true)
        setGpsLoading(false)
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? 'Location permission denied. You can enter your address manually.'
            : 'Could not get your location. Please enter it manually.',
        )
        setGpsLoading(false)
      },
      { timeout: 12000, enableHighAccuracy: true },
    )
  }

  // ── Photos ────────────────────────────────────────────────────────────────
  function handlePhotoAdd(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 4 - form.photoFiles.length)
    const previews = newFiles.map((f) => URL.createObjectURL(f))
    update('photoFiles', [...form.photoFiles, ...newFiles])
    update('photoPreviewUrls', [...form.photoPreviewUrls, ...previews])
  }

  function removePhoto(idx: number) {
    URL.revokeObjectURL(form.photoPreviewUrls[idx])
    update(
      'photoFiles',
      form.photoFiles.filter((_, i) => i !== idx),
    )
    update(
      'photoPreviewUrls',
      form.photoPreviewUrls.filter((_, i) => i !== idx),
    )
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (step === 0) return form.emergencyType !== ''
    if (step === 1) return form.description.trim().length >= 10
    return true
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }
  function back() {
    if (step > 0) setStep((s) => s - 1)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.emergencyType) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const report = await submitSosReport({
        emergencyType: form.emergencyType as SosEmergencyType,
        description: form.description,
        peopleCount: parseInt(form.peopleCount, 10) || 1,
        gpsLat: form.gpsLat,
        gpsLng: form.gpsLng,
        region: form.region,
        manualAddress: form.manualAddress,
        shareContact: form.shareContact,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        photos: form.photoFiles,
      })
      navigate(`/sos/track/${report.trackingCode}`, { state: { justSubmitted: true } })
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit your SOS. Please try again.')
      setSubmitting(false)
    }
  }

  const typeMeta = form.emergencyType ? SOS_TYPE_META[form.emergencyType as SosEmergencyType] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f12] via-[#0d1a1f] to-[#0a1419] flex flex-col items-center justify-start py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* SOS Branding */}
        <div className="flex items-center gap-3 mb-2">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-red-900/80 border border-red-700/60 shadow-lg shadow-red-900/40">
            <Siren className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Emergency SOS
            </h1>
            <p className="text-xs text-slate-400">Report an emergency · EthioAlert National System</p>
          </div>
        </div>

        {/* Critical notice */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-800/40 bg-amber-950/40 px-3 py-2.5 text-xs text-amber-300 mt-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong>Life-threatening emergency?</strong> Call <strong>911</strong> immediately. This form is for
            digital reporting — responses may take several minutes.
          </span>
        </div>
      </div>

      {/* Step Progress */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                      done
                        ? 'bg-teal-600 border-teal-500 text-white'
                        : active
                          ? 'bg-[#0d2a30] border-teal-500 text-teal-400'
                          : 'bg-[#0c1417] border-[#1b2e34] text-slate-600'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span
                    className={`mt-1 text-[9px] font-semibold uppercase tracking-wide hidden sm:block ${
                      active ? 'text-teal-400' : done ? 'text-teal-600' : 'text-slate-600'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-all ${
                      i < step ? 'bg-teal-600' : 'bg-[#1b2e34]'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Panel */}
      <div className="w-full max-w-lg bg-[#0f1e24] border border-[#1b2e34] rounded-2xl shadow-2xl overflow-hidden">
        {/* Step Header */}
        <div className="border-b border-[#1b2e34] px-5 py-4 bg-[#0c1417]/60">
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-500">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="text-lg font-bold text-white mt-0.5">{STEPS[step].label}</h2>
        </div>

        <div className="p-5 space-y-5">
          {/* ── STEP 0: Emergency Type ──────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Select the type of emergency you are reporting:</p>
              <div className="grid grid-cols-2 gap-3">
                {SOS_EMERGENCY_TYPES.map((type) => {
                  const meta = SOS_TYPE_META[type]
                  const selected = form.emergencyType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => update('emergencyType', type)}
                      className={`flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all ${
                        selected
                          ? `${meta.bg} border-teal-500/50 shadow-lg shadow-teal-900/20`
                          : 'border-[#1b2e34] bg-[#111d21] hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl">{meta.icon}</span>
                      <span className={`text-sm font-semibold ${selected ? meta.color : 'text-slate-200'}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">{meta.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 1: Description ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              {typeMeta && (
                <div
                  className={`flex items-center gap-2.5 rounded-xl border p-3 ${typeMeta.bg}`}
                >
                  <span className="text-xl">{typeMeta.icon}</span>
                  <span className={`text-sm font-semibold ${typeMeta.color}`}>{typeMeta.label}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  What happened? <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Describe the emergency clearly — what is happening, where exactly, any visible danger..."
                  className="w-full rounded-xl border border-[#1b2e34] bg-[#0c1417] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 resize-none"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  {form.description.trim().length}/10 chars minimum
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  Number of people affected
                </label>
                <div className="flex items-center gap-2">
                  {['1', '2–5', '6–10', '10+', 'Unknown'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('peopleCount', opt)}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                        form.peopleCount === opt
                          ? 'bg-teal-600/30 border-teal-500/60 text-teal-300'
                          : 'border-[#1b2e34] bg-[#0c1417] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Location ────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1b2e34] bg-[#0c1417] p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Navigation className="w-4 h-4 text-teal-400" />
                  GPS Location
                </div>
                <p className="text-xs text-slate-500">
                  Sharing your live GPS location helps responders reach you faster.
                </p>

                {form.locationPermitted ? (
                  <div className="flex items-center gap-2 rounded-lg bg-teal-900/30 border border-teal-800/40 px-3 py-2 text-xs text-teal-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>
                      Location captured: {form.gpsLat?.toFixed(5)}, {form.gpsLng?.toFixed(5)}
                      {form.gpsAccuracy != null && (
                        <span className="text-teal-500 ml-1">(±{Math.round(form.gpsAccuracy)}m)</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        update('locationPermitted', false)
                        update('gpsLat', null)
                        update('gpsLng', null)
                        update('gpsAccuracy', null)
                      }}
                      className="ml-auto text-teal-500 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={requestGps}
                    disabled={gpsLoading}
                    className="flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-600 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    {gpsLoading ? 'Getting location...' : 'Share my GPS location'}
                  </button>
                )}

                {gpsError && (
                  <p className="text-xs text-amber-400 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {gpsError}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide font-semibold">
                  <div className="flex-1 h-px bg-[#1b2e34]" />
                  or enter location manually
                  <div className="flex-1 h-px bg-[#1b2e34]" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Region</label>
                  <select
                    value={form.region}
                    onChange={(e) => update('region', e.target.value)}
                    className="w-full rounded-xl border border-[#1b2e34] bg-[#0c1417] px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-teal-500"
                  >
                    {ETHIOPIAN_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Street / Area description
                  </label>
                  <input
                    type="text"
                    value={form.manualAddress}
                    onChange={(e) => update('manualAddress', e.target.value)}
                    placeholder="e.g. Near Bole Medhanealem Church, 3rd floor"
                    className="w-full rounded-xl border border-[#1b2e34] bg-[#0c1417] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Photo Evidence ──────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Photos help responders assess the situation before arriving. <span className="text-slate-500">(Optional — max 4 images)</span>
              </p>

              {/* Photo grid */}
              {form.photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {form.photoPreviewUrls.map((url, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-[#1b2e34] bg-black aspect-video">
                      <img src={url} alt={`Scene photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {form.photoFiles.length < 4 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoAdd(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1b2e34] hover:border-teal-700 bg-[#0c1417] hover:bg-[#0d1f24] p-8 text-center transition-all"
                  >
                    <Camera className="w-8 h-8 text-slate-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        {form.photoPreviewUrls.length === 0 ? 'Add photos' : 'Add more photos'}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        JPG, PNG up to 10 MB each · {4 - form.photoFiles.length} remaining
                      </p>
                    </div>
                  </button>
                </>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-[#1b2e34] bg-[#0c1417] px-3 py-2.5 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-600" />
                <span>Photos are only visible to authorized emergency responders and are never published publicly.</span>
              </div>
            </div>
          )}

          {/* ── STEP 4: Contact Details ─────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Your contact details help responders reach you directly — only shared with response teams.
              </p>

              <div className="rounded-xl border border-[#1b2e34] bg-[#0c1417] p-4 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => update('shareContact', !form.shareContact)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      form.shareContact ? 'bg-teal-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        form.shareContact ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Share my contact details</p>
                    <p className="text-xs text-slate-500">Allow response team to call or message you</p>
                  </div>
                </label>

                {form.shareContact && (
                  <div className="space-y-3 pt-2 border-t border-[#1b2e34]">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-400" />
                        Your name
                      </label>
                      <input
                        type="text"
                        value={form.contactName}
                        onChange={(e) => update('contactName', e.target.value)}
                        placeholder="Full name"
                        className="w-full rounded-xl border border-[#1b2e34] bg-[#111d21] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal-400" />
                        Phone number
                      </label>
                      <input
                        type="tel"
                        value={form.contactPhone}
                        onChange={(e) => update('contactPhone', e.target.value)}
                        placeholder="+251 9XX XXX XXX"
                        className="w-full rounded-xl border border-[#1b2e34] bg-[#111d21] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {!form.shareContact && (
                <div className="flex items-start gap-2 rounded-xl border border-[#1b2e34] bg-[#0c1417] px-3 py-2.5 text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-600" />
                  <span>
                    You can submit without sharing contact details. Your report will still be processed and you will
                    receive a tracking code to follow progress.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: Review & Submit ─────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Review your report before submitting.</p>

              <div className="space-y-2">
                <ReviewRow
                  label="Emergency type"
                  value={
                    form.emergencyType
                      ? `${SOS_TYPE_META[form.emergencyType as SosEmergencyType].icon}  ${SOS_TYPE_META[form.emergencyType as SosEmergencyType].label}`
                      : '—'
                  }
                  onEdit={() => setStep(0)}
                />
                <ReviewRow
                  label="Description"
                  value={form.description || '—'}
                  onEdit={() => setStep(1)}
                  multiline
                />
                <ReviewRow
                  label="People affected"
                  value={form.peopleCount}
                  onEdit={() => setStep(1)}
                />
                <ReviewRow
                  label="Location"
                  value={
                    form.locationPermitted
                      ? `GPS: ${form.gpsLat?.toFixed(4)}, ${form.gpsLng?.toFixed(4)} · ${form.region}${form.manualAddress ? ` · ${form.manualAddress}` : ''}`
                      : form.manualAddress
                        ? `${form.region} · ${form.manualAddress}`
                        : form.region
                  }
                  onEdit={() => setStep(2)}
                />
                <ReviewRow
                  label="Photos"
                  value={
                    form.photoFiles.length > 0
                      ? `${form.photoFiles.length} photo${form.photoFiles.length > 1 ? 's' : ''} attached`
                      : 'None (optional)'
                  }
                  onEdit={() => setStep(3)}
                />
                <ReviewRow
                  label="Contact"
                  value={
                    form.shareContact && form.contactName
                      ? `${form.contactName}${form.contactPhone ? ` · ${form.contactPhone}` : ''}`
                      : 'Anonymous (no contact shared)'
                  }
                  onEdit={() => setStep(4)}
                />
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-800/40 bg-red-950/40 px-3 py-2.5 text-xs text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  {submitError}
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-teal-800/30 bg-teal-950/20 px-3 py-2.5 text-xs text-teal-400">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  After submitting, you will receive a <strong>tracking code</strong> to follow your report's
                  progress in real time.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-[#1b2e34] px-5 py-4 flex items-center justify-between gap-3 bg-[#0c1417]/40">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="flex items-center gap-1.5 rounded-xl border border-[#1b2e34] bg-transparent px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <span className="text-xs text-slate-600 tabular-nums">
            {step + 1} / {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !form.emergencyType}
              className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 px-5 py-2.5 text-sm font-bold text-white transition-colors shadow-lg shadow-red-900/40"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Siren className="w-4 h-4" />
                  Send SOS Report
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Track existing report link */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => navigate('/sos/track')}
          className="text-xs text-slate-500 hover:text-teal-400 transition-colors flex items-center gap-1 mx-auto"
        >
          Already submitted? Track your report
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Review Row helper ─────────────────────────────────────────────────────────
function ReviewRow({
  label,
  value,
  onEdit,
  multiline = false,
}: {
  label: string
  value: string
  onEdit: () => void
  multiline?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[#1b2e34] bg-[#0c1417] px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-0.5 text-sm text-slate-200 ${multiline ? 'line-clamp-3' : 'truncate'}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[11px] text-teal-500 hover:text-teal-300 font-medium mt-0.5"
      >
        Edit
      </button>
    </div>
  )
}
