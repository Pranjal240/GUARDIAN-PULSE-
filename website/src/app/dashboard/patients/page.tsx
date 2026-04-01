'use client'
import { useState } from 'react'
import { Search, User, Phone, Mail, Shield, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useAllPatients } from '@/lib/firebase-hooks'
import { useLiveVitals } from '@/lib/firebase-hooks'
import SkeletonCard from '@/components/SkeletonCard'
import { Patient } from '@/lib/firebase-hooks'

function PatientRow({ patient, index }: { patient: Patient; index: number }) {
  const vitals = useLiveVitals(patient.userId || '')
  const [expanded, setExpanded] = useState(false)
  const status = vitals.bpm >= 130 || (vitals.bpm > 0 && vitals.bpm < 50) ? 'critical' : vitals.bpm >= 100 ? 'warning' : vitals.bpm > 0 ? 'normal' : 'offline'
  const borderColor = status === 'critical' ? 'border-l-[#E05252]' : status === 'warning' ? 'border-l-[#E8A838]' : 'border-l-transparent'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`card border-l-4 ${borderColor} overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#3D5738]/20 transition-colors"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#4A6741] flex items-center justify-center flex-shrink-0">
          <span className="text-[#F2E8D9] text-sm font-bold">
            {(patient.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
          </span>
        </div>
        {/* Name & email */}
        <div className="flex-1 text-left min-w-0">
          <h4 className="font-poppins font-semibold text-[#F2E8D9]">{(patient?.name ?? 'Unknown')}</h4>
          <p className="text-xs text-[#6B7F67] truncate">{(patient?.email ?? '')}</p>
        </div>
        {/* Mode badge */}
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3D5738]/50 text-[#A8B5A2] capitalize flex-shrink-0">
          {(patient?.mode ?? 'normal')}
        </span>
        {/* BPM */}
        <span className={`font-mono-data text-sm font-bold w-20 text-right flex-shrink-0 ${
          status === 'critical' ? 'text-[#E05252]' : status === 'warning' ? 'text-[#E8A838]' : status === 'normal' ? 'text-[#5CB85C]' : 'text-[#6B7F67]'
        }`}>
          {vitals.bpm === 0 ? '-- BPM' : `${vitals.bpm} BPM`}
        </span>
        {/* Status */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full w-20 text-center flex-shrink-0 ${
          status === 'critical' ? 'badge-critical' : status === 'warning' ? 'badge-warning' : status === 'normal' ? 'badge-normal' : 'text-[#6B7F67] bg-[#3D5738]/30'
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {/* Joined */}
        <span className="text-xs text-[#6B7F67] flex-shrink-0 hidden lg:block">
          {patient.createdAt ? format(new Date(patient.createdAt), 'MMM d, yyyy') : '—'}
        </span>
        <ChevronDown className={`text-[#6B7F67] transition-transform ${expanded ? 'rotate-180' : ''}`} size={16} />
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          className="border-t border-[#3D5738]/50 px-4 py-4 grid grid-cols-3 gap-4"
        >
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-[#A8B5A2]" />
            <span className="text-[#F2E8D9]">{(patient?.phone ?? '') || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield size={14} className="text-[#A8B5A2]" />
            <span className="text-[#F2E8D9]">{patient.emergencyContact1Name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-[#A8B5A2]" />
            <span className="text-[#F2E8D9]">{patient.emergencyContact1Phone ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-[#A8B5A2]" />
            <span className="text-[#6B7F67]">ID: </span>
            <span className="text-[#A8B5A2] font-mono-data text-xs truncate">{(patient.userId || '').slice(0, 16)}…</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function PatientsPage() {
  const { data: patients, loading } = useAllPatients()
  const [search, setSearch] = useState('')

  const filtered = patients.filter(p =>
    (p.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7F67]" />
          <input
            className="input-olive pl-9 w-64"
            placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-[#A8B5A2] text-sm">{filtered.length} patients</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[40px_1fr_100px_100px_100px_120px_32px] gap-4 px-4 text-xs text-[#6B7F67] font-medium uppercase tracking-wider">
        <span />
        <span>Name / Email</span>
        <span>Mode</span>
        <span className="text-right">BPM</span>
        <span className="text-center">Status</span>
        <span className="hidden lg:block">Joined</span>
        <span />
      </div>

      {/* Patient Rows */}
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} height="h-16" />)
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-[#A8B5A2]">No patients found</div>
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
