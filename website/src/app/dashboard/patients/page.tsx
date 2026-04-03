'use client'
import { useState } from 'react'
import { Search, User, Phone, Mail, Shield, ChevronDown, Heart, Activity, Brain, Droplets, Thermometer, Wind, MessageSquare, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useAllPatients, useLiveVitals, usePatientDemoVitals, Patient } from '@/lib/firebase-hooks'
import SkeletonCard from '@/components/SkeletonCard'
import Link from 'next/link'

function PatientRow({ patient, index }: { patient: Patient; index: number }) {
  const vitals = useLiveVitals(patient.userId || '')
  const demoVitals = usePatientDemoVitals(patient.userId || '')
  const [expanded, setExpanded] = useState(false)

  // Use live vitals if available, otherwise use demo vitals
  const bpm = vitals.bpm > 0 ? vitals.bpm : (demoVitals ? 72 : 0)
  const status = bpm >= 130 || (bpm > 0 && bpm < 50) ? 'critical' : bpm >= 100 ? 'warning' : bpm > 0 ? 'normal' : 'offline'
  const borderColor = status === 'critical' ? 'border-l-[#E05252]' : status === 'warning' ? 'border-l-[#E8A838]' : status === 'normal' ? 'border-l-[#4CAF78]' : 'border-l-transparent'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-[#1C2B1E] rounded-xl border-l-4 ${borderColor} border border-[rgba(212,184,150,0.08)] overflow-hidden hover:border-[rgba(212,184,150,0.15)] transition-all`}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 text-left hover:bg-[rgba(212,184,150,0.03)] transition-colors"
      >
        {/* Avatar */}
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#4A6741] flex items-center justify-center flex-shrink-0 relative">
          <span className="text-[#F2E8D9] text-xs md:text-sm font-bold">
            {(patient.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
          </span>
          {patient.needsSupport && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#E05252] rounded-full border-2 border-[#1C2B1E] animate-pulse" />
          )}
        </div>
        {/* Name & email */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-poppins font-semibold text-sm text-[#F2E8D9] truncate">{(patient?.name ?? 'Unknown')}</h4>
            {patient.needsSupport && (
              <span className="text-[8px] md:text-[9px] px-1.5 py-0.5 bg-[#E05252]/15 text-[#E05252] border border-[#E05252]/30 rounded-full font-bold uppercase tracking-wider shrink-0">
                SOS
              </span>
            )}
          </div>
          <p className="text-[10px] md:text-xs text-[#6B7F67] truncate">{(patient?.email ?? '')}</p>
        </div>
        {/* Mode badge */}
        <span className="text-[9px] md:text-[10px] px-2 py-0.5 rounded-full bg-[#3D5738]/50 text-[#A8B5A2] capitalize flex-shrink-0 hidden sm:inline">
          {(patient?.mode ?? 'normal')}
        </span>
        {/* Vitals mini row */}
        {demoVitals && (
          <div className="hidden lg:flex items-center gap-3 text-[10px] text-[#9BA897] shrink-0">
            <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3 text-[#5B9BD5]" />{demoVitals.spO2}%</span>
            <span className="flex items-center gap-0.5"><Brain className="w-3 h-3 text-[#D4B896]" />{demoVitals.stress}/100</span>
            <span className="flex items-center gap-0.5"><Thermometer className="w-3 h-3 text-[#D4943A]" />{demoVitals.bodyTemp}°F</span>
          </div>
        )}
        {/* BPM */}
        <span className={`font-mono text-xs md:text-sm font-bold w-16 md:w-20 text-right flex-shrink-0 ${
          status === 'critical' ? 'text-[#E05252]' : status === 'warning' ? 'text-[#E8A838]' : status === 'normal' ? 'text-[#5CB85C]' : 'text-[#6B7F67]'
        }`}>
          {bpm === 0 ? '-- BPM' : `${bpm} BPM`}
        </span>
        {/* Status */}
        <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded-full w-16 md:w-20 text-center flex-shrink-0 font-bold uppercase tracking-wider ${
          status === 'critical' ? 'text-[#E05252] bg-[#E05252]/15 border border-[#E05252]/30' : status === 'warning' ? 'text-[#E8A838] bg-[#E8A838]/15 border border-[#E8A838]/30' : status === 'normal' ? 'text-[#5CB85C] bg-[#5CB85C]/15 border border-[#5CB85C]/30' : 'text-[#6B7F67] bg-[#3D5738]/30'
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {/* Joined */}
        <span className="text-[10px] md:text-xs text-[#6B7F67] flex-shrink-0 hidden lg:block">
          {patient.createdAt ? format(new Date(patient.createdAt), 'MMM d, yyyy') : '—'}
        </span>
        <ChevronDown className={`text-[#6B7F67] transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} size={16} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[rgba(212,184,150,0.08)]"
          >
            <div className="px-4 py-4 space-y-4">
              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 text-sm bg-[#141A14] p-2.5 rounded-lg border border-[rgba(212,184,150,0.05)]">
                  <Phone size={14} className="text-[#A8B5A2] shrink-0" />
                  <span className="text-[#F2E8D9] truncate">{(patient?.phone ?? '') || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-[#141A14] p-2.5 rounded-lg border border-[rgba(212,184,150,0.05)]">
                  <Shield size={14} className="text-[#A8B5A2] shrink-0" />
                  <span className="text-[#F2E8D9] truncate">{patient.emergencyContact1Name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-[#141A14] p-2.5 rounded-lg border border-[rgba(212,184,150,0.05)]">
                  <Phone size={14} className="text-[#A8B5A2] shrink-0" />
                  <span className="text-[#F2E8D9] truncate">{patient.emergencyContact1Phone ?? '—'}</span>
                </div>
              </div>

              {/* Vitals Detail Grid — Shows the same demo data the patient sees */}
              {demoVitals && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {[
                    { label: 'SpO₂', value: `${demoVitals.spO2}%`, icon: Droplets, color: demoVitals.spO2 > 95 ? '#4CAF78' : '#D4943A' },
                    { label: 'HRV', value: `${demoVitals.hrv}ms`, icon: Activity, color: '#5B9BD5' },
                    { label: 'Stress', value: `${demoVitals.stress}/100`, icon: Brain, color: demoVitals.stress > 50 ? '#E05252' : '#D4B896' },
                    { label: 'Temp', value: `${demoVitals.bodyTemp}°F`, icon: Thermometer, color: demoVitals.bodyTemp > 99 ? '#E05252' : '#D4943A' },
                    { label: 'Resp', value: `${demoVitals.respRate} br/m`, icon: Wind, color: '#4CAF78' },
                    { label: 'BP', value: `${demoVitals.bloodPressureSys}/${demoVitals.bloodPressureDia}`, icon: Heart, color: demoVitals.bloodPressureSys > 130 ? '#E05252' : '#D4B896' },
                    { label: 'Sleep', value: demoVitals.heartRhythm ? `${demoVitals.heartRhythm}/100` : '--', icon: Activity, color: '#4CAF78' },
                    { label: 'Tremor', value: demoVitals.tremorScore ? `${demoVitals.tremorScore}/100` : '--', icon: Activity, color: '#D4943A' },
                    { label: 'Seizure', value: demoVitals.seizureRisk ? `${demoVitals.seizureRisk}%` : '--', icon: Brain, color: '#E05252' },
                  ].map(v => (
                    <div key={v.label} className="bg-[#141A14] p-2.5 rounded-lg border border-[rgba(212,184,150,0.05)] text-center">
                      <v.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: v.color }} />
                      <p className="font-mono text-xs font-bold text-[#F0E6D3]">{v.value}</p>
                      <p className="text-[9px] text-[#7A8A76] uppercase tracking-wider mt-0.5">{v.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div className="flex items-center gap-2 pt-1">
                <Link href={`/dashboard/ecg?userId=${patient.userId}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#D4B896] bg-[rgba(212,184,150,0.08)] hover:bg-[rgba(212,184,150,0.15)] border border-[rgba(212,184,150,0.15)] px-3 py-1.5 rounded-lg transition-colors">
                  <Activity className="w-3.5 h-3.5" /> ECG Monitor
                </Link>
                <Link href={`/dashboard/support`}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#5B9BD5] bg-[rgba(91,155,213,0.08)] hover:bg-[rgba(91,155,213,0.15)] border border-[rgba(91,155,213,0.15)] px-3 py-1.5 rounded-lg transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                </Link>
                <div className="flex items-center gap-1.5 ml-auto">
                  <User size={12} className="text-[#6B7F67]" />
                  <span className="text-[#7A8A76] font-mono text-[10px] truncate max-w-[120px]">{patient.userId}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function PatientsPage() {
  const { data: patients, loading } = useAllPatients()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'sos' | 'online'>('all')

  const filtered = patients.filter(p => {
    const matchesSearch = (p.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.email ?? '').toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'sos') return p.needsSupport === true
    return true
  })

  const sosCount = patients.filter(p => p.needsSupport).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7F67]" />
          <input
            className="w-full bg-[#141A14] text-[#F0E6D3] text-sm border border-[#2A3D2E] rounded-lg pl-9 pr-3 py-2 outline-none focus:border-[#D4B896] transition-colors"
            placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'sos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filter === f
                  ? 'bg-[rgba(212,184,150,0.12)] text-[#D4B896] border border-[rgba(212,184,150,0.3)]'
                  : 'bg-[#141A14] text-[#7A8A76] border border-[#2A3D2E] hover:text-[#9BA897]'
              }`}
            >
              {f === 'sos' && <AlertTriangle className="w-3 h-3" />}
              {f === 'all' ? 'All' : 'Needs Help'}
              {f === 'sos' && sosCount > 0 && (
                <span className="bg-[#E05252] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-mono">{sosCount}</span>
              )}
            </button>
          ))}
          <span className="text-[#A8B5A2] text-xs md:text-sm ml-2">{filtered.length} patients</span>
        </div>
      </div>

      {/* Patient Rows */}
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} height="h-16" />)
      ) : filtered.length === 0 ? (
        <div className="bg-[#1C2B1E] rounded-xl border border-[rgba(212,184,150,0.08)] p-10 text-center">
          <User className="w-8 h-8 text-[#5C6B58] mx-auto mb-3" />
          <p className="text-[#A8B5A2]">No patients found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => (
            <PatientRow key={p.userId} patient={p} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
