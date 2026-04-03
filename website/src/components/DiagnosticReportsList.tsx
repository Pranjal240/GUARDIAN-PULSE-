'use client';

import { motion } from 'framer-motion';
import { Waves, Activity, AlertTriangle, PersonStanding, Gauge, Droplets } from 'lucide-react';

export interface VitalsData {
  heartRhythm?: number;
  tremorScore?: number;
  seizureRisk?: number;
  gaitStability?: number;
  panicScore?: number;
  spO2?: number;
}

export default function DiagnosticReportsList({ vitals = {} }: { vitals?: VitalsData }) {
  // Use safe fallbacks in case vitals are missing before sync
  const heartRhythm = vitals.heartRhythm || 0;
  const tremorScore = vitals.tremorScore || 0;
  const seizureRisk = vitals.seizureRisk || 0;
  const gaitStability = vitals.gaitStability || 0;
  const panicScore = vitals.panicScore || 0;
  const spO2 = vitals.spO2 || 0;

  return (
    <div className="space-y-2.5 md:space-y-3">
      {[
        {
          label: 'Heart Rhythm Analysis',
          value: heartRhythm,
          max: 100,
          icon: Waves,
          fromColor: heartRhythm > 85 ? '#4CAF78' : '#D4943A',
          toColor: heartRhythm > 85 ? '#5CB85C' : '#E8B54A',
          gradient: heartRhythm > 85 ? 'from-[#4CAF78] to-[#5CB85C]' : 'from-[#D4943A] to-[#E8B54A]',
          status: heartRhythm > 90 ? 'Normal Sinus' : heartRhythm > 80 ? 'Minor Irregularity' : 'Arrhythmia Detected',
          statusColor: heartRhythm > 90 ? '#4CAF78' : heartRhythm > 80 ? '#D4943A' : '#E05252',
          detail: 'Regularity score based on ECG waveform analysis',
        },
        {
          label: 'Body Tremor Detection',
          value: tremorScore,
          max: 100,
          icon: Activity,
          fromColor: tremorScore < 15 ? '#4CAF78' : '#E05252',
          toColor: tremorScore < 15 ? '#5CB85C' : '#E88A4A',
          gradient: tremorScore < 15 ? 'from-[#4CAF78] to-[#5CB85C]' : 'from-[#E05252] to-[#E88A4A]',
          status: tremorScore < 10 ? 'No Tremor' : tremorScore < 20 ? 'Mild Tremor' : 'Moderate Tremor',
          statusColor: tremorScore < 10 ? '#4CAF78' : tremorScore < 20 ? '#D4943A' : '#E05252',
          detail: 'IMU accelerometer-based tremor severity index',
        },
        {
          label: 'Seizure Risk Assessment',
          value: seizureRisk,
          max: 100,
          icon: AlertTriangle,
          fromColor: seizureRisk < 10 ? '#4CAF78' : '#E05252',
          toColor: seizureRisk < 10 ? '#5CB85C' : '#E88A4A',
          gradient: seizureRisk < 10 ? 'from-[#4CAF78] to-[#5CB85C]' : 'from-[#E05252] to-[#E88A4A]',
          status: seizureRisk < 8 ? 'Low Risk' : seizureRisk < 18 ? 'Moderate Risk' : 'High Risk',
          statusColor: seizureRisk < 8 ? '#4CAF78' : seizureRisk < 18 ? '#D4943A' : '#E05252',
          detail: 'Probability score based on EEG-ECG correlation',
        },
        {
          label: 'Gait & Balance Analysis',
          value: gaitStability,
          max: 100,
          icon: PersonStanding,
          fromColor: gaitStability > 80 ? '#4CAF78' : '#D4943A',
          toColor: gaitStability > 80 ? '#5CB85C' : '#E8B54A',
          gradient: gaitStability > 80 ? 'from-[#4CAF78] to-[#5CB85C]' : 'from-[#D4943A] to-[#E8B54A]',
          status: gaitStability > 85 ? 'Stable' : gaitStability > 70 ? 'Mild Instability' : 'Fall Risk',
          statusColor: gaitStability > 85 ? '#4CAF78' : gaitStability > 70 ? '#D4943A' : '#E05252',
          detail: 'Posture stability via gyroscope + accelerometer fusion',
        },
        {
          label: 'Panic Episode Monitor',
          value: panicScore,
          max: 100,
          icon: Gauge,
          fromColor: panicScore < 20 ? '#4CAF78' : '#E05252',
          toColor: panicScore < 20 ? '#5CB85C' : '#E88A4A',
          gradient: panicScore < 20 ? 'from-[#4CAF78] to-[#5CB85C]' : 'from-[#E05252] to-[#E88A4A]',
          status: panicScore < 15 ? 'Calm' : panicScore < 30 ? 'Mild Anxiety' : 'Panic Detected',
          statusColor: panicScore < 15 ? '#4CAF78' : panicScore < 30 ? '#D4943A' : '#E05252',
          detail: 'Combined HRV + GSR + respiratory pattern analysis',
        },
        {
          label: 'Blood Oxygen Trend (SpO₂)',
          value: spO2,
          max: 100,
          icon: Droplets,
          fromColor: spO2 > 96 ? '#4CAF78' : '#D4943A',
          toColor: spO2 > 96 ? '#5CB85C' : '#E8B54A',
          gradient: spO2 > 96 ? 'from-[#4CAF78] to-[#5CB85C]' : 'from-[#D4943A] to-[#E8B54A]',
          status: spO2 > 95 ? 'Optimal' : spO2 > 92 ? 'Moderate' : 'Hypoxia Risk',
          statusColor: spO2 > 95 ? '#4CAF78' : spO2 > 92 ? '#D4943A' : '#E05252',
          detail: 'Continuous arterial oxygen saturation tracking',
        },
      ].map((report, idx) => {
        const pct = Math.min((report.value / report.max) * 100, 100);
        return (
          <motion.div key={report.label}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + idx * 0.08 }}
            whileHover={{ scale: 1.02, x: 4 }}
            className="group cursor-default p-2.5 md:p-3 rounded-xl bg-[#0C1210] border border-[rgba(212,184,150,0.06)] hover:border-[rgba(212,184,150,0.2)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all relative overflow-hidden">
            {/* Left accent */}
            <div className="absolute top-0 left-0 bottom-0 w-[2px] rounded-full" style={{ backgroundColor: report.statusColor }} />

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 ml-1">
                <motion.div whileHover={{ rotate: 15 }}
                  className="p-1.5 rounded-lg" style={{ backgroundColor: `${report.fromColor}15` }}>
                  <report.icon className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: report.fromColor }} />
                </motion.div>
                <div>
                  <span className="text-[10px] md:text-xs text-[#C0B8A9] font-medium block group-hover:text-[#F0E6D3] transition-colors">{report.label}</span>
                  <span className="text-[8px] md:text-[9px] text-[#5C6B58] block">{report.detail}</span>
                </div>
              </div>
              <div className="text-right">
                <motion.span key={report.value} initial={{ scale: 1.3, color: report.statusColor }} animate={{ scale: 1, color: '#D4B896' }}
                  className="font-mono font-bold text-sm md:text-base block">
                  {report.value}<span className="text-[9px] text-[#5C6B58]">/100</span>
                </motion.span>
                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                  style={{ color: report.statusColor, backgroundColor: `${report.statusColor}15`, border: `1px solid ${report.statusColor}30` }}>
                  {report.status}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative w-full bg-[#141A14] rounded-full h-1.5 md:h-2 overflow-hidden border border-[rgba(212,184,150,0.05)] ml-1">
              <motion.div
                className={`h-full bg-gradient-to-r ${report.gradient} rounded-full relative`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}>
                <div className="absolute right-0 top-0 bottom-0 w-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `radial-gradient(circle, ${report.toColor}80, transparent)`, boxShadow: `0 0 6px ${report.toColor}60` }} />
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
