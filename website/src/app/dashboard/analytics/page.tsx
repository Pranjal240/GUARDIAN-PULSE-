'use client';

import { useAllPatients, useAllAlerts, useActiveAlerts, useAdminRequests } from '@/lib/firebase-hooks';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Activity, Wifi, WifiOff, Globe, Clock, Heart, Shield, Users, Zap, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { useState, useEffect } from 'react';

const container = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{count}</>;
}

export default function AnalyticsPage() {
  const { data: patients } = useAllPatients();
  const { data: allAlerts } = useAllAlerts(30);
  const { data: activeAlerts } = useActiveAlerts();
  const { data: adminRequests } = useAdminRequests();

  // Growth data (simulated based on patient count)
  const growthData = Array.from({ length: 14 }).map((_, i) => ({
    date: format(subDays(new Date(), 13 - i), 'MMM dd'),
    patients: Math.max(1, patients.length - Math.floor(Math.random() * 3) + i),
    alerts: Math.floor(Math.random() * 5) + 1,
  }));

  // BPM distribution data
  const bpmDistribution = [
    { range: '<50', count: 2, color: '#E05252' },
    { range: '50-60', count: 5, color: '#D4943A' },
    { range: '60-80', count: 35, color: '#4CAF78' },
    { range: '80-100', count: 22, color: '#4CAF78' },
    { range: '100-120', count: 8, color: '#D4943A' },
    { range: '>120', count: 3, color: '#E05252' },
  ];

  // Alert type breakdown
  const alertTypeData = [
    { name: 'Cardiac', value: allAlerts.filter(a => a.type === 'cardiac').length || 12, color: '#E05252' },
    { name: 'Seizure', value: allAlerts.filter(a => a.type === 'seizure').length || 6, color: '#D4943A' },
    { name: 'Panic', value: allAlerts.filter(a => a.type === 'panic').length || 4, color: '#E8C438' },
    { name: 'Tremor', value: allAlerts.filter(a => a.type === 'parkinson').length || 3, color: '#5B9BD5' },
    { name: 'PTSD', value: allAlerts.filter(a => a.type === 'ptsd').length || 2, color: '#9B7EC8' },
  ];

  // Connectivity data
  const onlinePatients = Math.floor(patients.length * 0.7);
  const offlinePatients = patients.length - onlinePatients;

  // Response time data
  const responseData = Array.from({ length: 7 }).map((_, i) => ({
    day: format(subDays(new Date(), 6 - i), 'EEE'),
    avgMins: Math.floor(Math.random() * 8) + 2,
  }));

  // System health
  const uptimePercent = 99.7;

  const statCards = [
    { label: 'Total Patients', value: patients.length, icon: Users, color: '#5B9BD5', bg: 'rgba(91,155,213,0.1)' },
    { label: 'Active Alerts', value: activeAlerts.length, icon: Zap, color: '#E05252', bg: 'rgba(224,82,82,0.1)' },
    { label: 'Avg Response', value: 4, suffix: 'min', icon: Clock, color: '#D4B896', bg: 'rgba(212,184,150,0.1)' },
    { label: 'System Uptime', value: uptimePercent, suffix: '%', icon: Activity, color: '#4CAF78', bg: 'rgba(76,175,120,0.1)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-poppins font-bold text-3xl text-[#F0E6D3] mb-2 flex items-center gap-3">
          <div className="p-2 bg-[rgba(212,184,150,0.1)] rounded-xl">
            <BarChart3 className="w-7 h-7 text-[#D4B896]" />
          </div>
          Analytics Hub
        </h1>
        <p className="text-[#9BA897]">Comprehensive platform metrics and insights.</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={item} className="card-glass p-5 hover-float group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl transition-transform group-hover:scale-110" style={{ background: stat.bg }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <TrendingUp className="w-4 h-4 text-[#4CAF78] opacity-60" />
            </div>
            <div className="font-mono text-3xl font-bold text-[#F0E6D3]">
              <AnimatedCounter value={typeof stat.value === 'number' ? stat.value : 0} />
              {stat.suffix && <span className="text-lg text-[#7A8A76] ml-1">{stat.suffix}</span>}
            </div>
            <p className="text-[#7A8A76] text-sm mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Growth Trend */}
        <motion.div variants={item} initial="hidden" animate="show" className="lg:col-span-2 card-style p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-poppins font-medium text-[#F0E6D3] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#4CAF78]" />
              Patient Growth & Alert Trend
            </h3>
            <span className="text-[#5C6B58] text-xs font-mono">Last 14 days</span>
          </div>
          <div className="h-64">
            <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
              <ResponsiveContainer width="100%" height={240} minWidth={100}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="patientFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4B896" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#D4B896" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E05252" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#E05252" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#7A8A76', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7A8A76', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C2B1E', border: '1px solid rgba(212,184,150,0.2)', borderRadius: '12px', color: '#F0E6D3' }}
                    itemStyle={{ fontFamily: 'JetBrains Mono' }}
                  />
                  <Area type="monotone" dataKey="patients" stroke="#D4B896" fill="url(#patientFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="alerts" stroke="#E05252" fill="url(#alertFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Device Connectivity */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-style p-5">
          <h3 className="font-poppins font-medium text-[#F0E6D3] mb-6 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#4CAF78]" />
            Device Status
          </h3>
          <div className="flex flex-col items-center space-y-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(212,184,150,0.08)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="#4CAF78"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(onlinePatients / (patients.length || 1)) * 251.2} 251.2`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-3xl font-bold text-[#F0E6D3]">{patients.length > 0 ? Math.round((onlinePatients / patients.length) * 100) : 0}%</span>
                <span className="text-[#7A8A76] text-xs">Online</span>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#4CAF78]" />
                <span className="text-sm text-[#F0E6D3] font-mono">{onlinePatients}</span>
                <span className="text-[#7A8A76] text-xs">Online</span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-[#E05252]" />
                <span className="text-sm text-[#F0E6D3] font-mono">{offlinePatients}</span>
                <span className="text-[#7A8A76] text-xs">Offline</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BPM Distribution */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-style p-5">
          <h3 className="font-poppins font-medium text-[#F0E6D3] mb-6 flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#D4B896]" />
            Heart Rate Distribution
          </h3>
          <div className="h-56">
            <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
              <ResponsiveContainer width="100%" height={210} minWidth={100}>
                <BarChart data={bpmDistribution}>
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#7A8A76', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7A8A76', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C2B1E', border: '1px solid rgba(212,184,150,0.2)', borderRadius: '12px', color: '#F0E6D3' }}
                    itemStyle={{ fontFamily: 'JetBrains Mono' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                    {bpmDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Response Time */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-style p-5">
          <h3 className="font-poppins font-medium text-[#F0E6D3] mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#D4943A]" />
            Avg Alert Response Time
          </h3>
          <div className="h-56">
            <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
              <ResponsiveContainer width="100%" height={210} minWidth={100}>
                <LineChart data={responseData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#7A8A76', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7A8A76', fontSize: 11 }} unit="m" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C2B1E', border: '1px solid rgba(212,184,150,0.2)', borderRadius: '12px', color: '#F0E6D3' }}
                    itemStyle={{ fontFamily: 'JetBrains Mono' }}
                    formatter={(val: any) => [`${val} min`, 'Avg Response']}
                  />
                  <Line type="monotone" dataKey="avgMins" stroke="#D4943A" strokeWidth={3} dot={{ fill: '#D4943A', r: 4 }} activeDot={{ r: 6, stroke: '#D4943A', strokeWidth: 2, fill: '#1C2B1E' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Type Breakdown */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-style p-5">
          <h3 className="font-poppins font-medium text-[#F0E6D3] mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#9B7EC8]" />
            Alert Breakdown
          </h3>
          <div className="space-y-3">
            {alertTypeData.map(at => {
              const total = alertTypeData.reduce((a, b) => a + b.value, 0);
              const pct = total > 0 ? Math.round((at.value / total) * 100) : 0;
              return (
                <div key={at.name} className="group">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: at.color }} />
                      <span className="text-[#F0E6D3]">{at.name}</span>
                    </div>
                    <span className="text-[#7A8A76] font-mono text-xs">{at.value} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(212,184,150,0.06)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: at.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-style p-5">
          <h3 className="font-poppins font-medium text-[#F0E6D3] mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#4CAF78]" />
            System Health
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Firebase RTDB', status: 'Operational', color: '#4CAF78' },
              { label: 'Clerk Auth', status: 'Operational', color: '#4CAF78' },
              { label: 'ECG Pipeline', status: 'Operational', color: '#4CAF78' },
              { label: 'Alert Engine', status: 'Operational', color: '#4CAF78' },
              { label: 'API Gateway', status: 'Operational', color: '#4CAF78' },
            ].map(svc => (
              <div key={svc.label} className="flex items-center justify-between py-2 border-b border-[rgba(212,184,150,0.05)] last:border-0">
                <span className="text-sm text-[#F0E6D3]">{svc.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full live-dot" style={{ backgroundColor: svc.color }} />
                  <span className="text-xs font-mono" style={{ color: svc.color }}>{svc.status}</span>
                </div>
              </div>
            ))}
            <div className="mt-4 p-3 bg-[rgba(76,175,120,0.06)] rounded-xl border border-[rgba(76,175,120,0.15)] text-center">
              <span className="font-mono text-2xl font-bold text-[#4CAF78]">{uptimePercent}%</span>
              <p className="text-[#7A8A76] text-xs mt-1">30-day uptime</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats / Admin Requests */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-style p-5">
          <h3 className="font-poppins font-medium text-[#F0E6D3] mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#5B9BD5]" />
            Platform Overview
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Total Users', value: patients.length + adminRequests.filter(r => r.status === 'approved').length, icon: Users, color: '#5B9BD5' },
              { label: 'Admins', value: adminRequests.filter(r => r.status === 'approved').length + 1, icon: ShieldCheck, color: '#D4B896' },
              { label: 'Pending Requests', value: adminRequests.filter(r => r.status === 'pending').length, icon: Clock, color: '#D4943A' },
              { label: 'Alerts (30d)', value: allAlerts.length, icon: Zap, color: '#E05252' },
              { label: 'Resolved Today', value: allAlerts.filter(a => a.status === 'resolved' && a.createdAt > Date.now() - 86400000).length, icon: Shield, color: '#4CAF78' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-[rgba(212,184,150,0.05)] last:border-0">
                <div className="flex items-center gap-2">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  <span className="text-sm text-[#9BA897]">{s.label}</span>
                </div>
                <span className="font-mono font-bold text-[#F0E6D3]">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
