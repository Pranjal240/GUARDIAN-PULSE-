'use client'
import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAllPatients, useLiveVitals } from '@/lib/firebase-hooks'
import { usePatientECG } from '@/lib/firebase-hooks'
import EcgChart from '@/components/EcgChart'
import SkeletonCard from '@/components/SkeletonCard'
import { Patient } from '@/lib/firebase-hooks'

function PatientEcgCard({ patient }: { patient: Patient }) {
  const { data: ecg } = usePatientECG(patient.userId || '', 60)
  const vitals = useLiveVitals(patient.userId || '')

  const bpm = vitals.bpm
  const status = bpm >= 130 || (bpm > 0 && bpm < 50) ? 'critical' : bpm >= 100 ? 'warning' : 'normal'
  const statusLabel = bpm >= 130 ? 'Tachycardia' : bpm < 50 && bpm > 0 ? 'Bradycardia' : bpm >= 100 ? 'Elevated' : bpm === 0 ? 'Offline' : 'Normal'
  const ecgData = ecg.map(r => r.voltage || 0)

  const initials = (patient.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'

  // Generate hash-based avatar color from name
  const hash = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)
  const avatarColors = ['#2A3D2E', '#3D5738', '#4A6741', '#223026', '#1C2B1E']
  const avatarBg = avatarColors[hash % avatarColors.length]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
      className={`card p-4 transition-shadow cursor-pointer ${
        status === 'critical' ? 'animate-critical border border-[#E05252]/40' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: avatarBg, border: '2px solid rgba(212,184,150,0.2)' }}
        >
          <span className="text-[#D4B896] text-sm font-bold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
                  <h4 className="font-poppins font-semibold text-[#F0E6D3] truncate">{(patient?.name ?? 'Unknown')}</h4>
                  <p className="text-xs text-[#7A8A76] truncate">{(patient?.role ?? 'patient')}</p>
                  <p className="text-xs text-[#6B7F67] capitalize">{(patient?.mode ?? 'normal')} mode</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
          status === 'critical' ? 'badge-critical' : status === 'warning' ? 'badge-warning' : 'badge-normal'
        }`}>
          {statusLabel}
        </span>
      </div>

      {/* ECG Chart */}
      <EcgChart data={ecgData.slice(-40)} height={90} status={status} />

      {/* BPM Footer */}
      <div className="mt-2 flex items-center justify-between">
        <span className={`font-mono-data text-xl font-bold ${
          status === 'critical' ? 'text-[#E05252]' : status === 'warning' ? 'text-[#E8A838]' : 'text-[#F2E8D9]'
        }`}>
          {bpm === 0 ? '--' : bpm} <span className="text-xs text-[#6B7F67] font-normal">BPM</span>
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${vitals.connected ? 'bg-[#5CB85C] live-dot' : 'bg-[#6B7F67]'}`} />
          <span className="text-[10px] text-[#6B7F67]">{vitals.connected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function EcgMonitorPage() {
  const { data: patients, loading } = useAllPatients()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = patients.filter(p =>
    (p.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="card p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7F67]" />
          <input
            className="input-olive w-full pl-9"
            placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[#A8B5A2]" />
          <select
            className="input-olive text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="normal">Normal</option>
          </select>
        </div>
        <div className="text-[#A8B5A2] text-sm whitespace-nowrap">
          {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Patient ECG Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} height="h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[#A8B5A2]">No patients found</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((patient, i) => (
            <motion.div
              key={patient.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <PatientEcgCard patient={patient} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
