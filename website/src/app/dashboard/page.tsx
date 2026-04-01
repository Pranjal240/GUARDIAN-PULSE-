'use client';

import { useSystemStats, useActiveAlerts, useAllPatients, useLatestECGPerPatient, classifyAlertType, calculateBpmStatus } from '@/lib/firebase-hooks';
import StatCard from '@/components/StatCard';
import { Users, AlertTriangle, Heart, Zap, CheckCircle, Phone, ArrowRight, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from 'date-fns';
import { useAuth } from '@clerk/nextjs';

export default function DashboardOverview() {
  const { data: stats, loading: statsLoading } = useSystemStats();
  const { data: activeAlerts } = useActiveAlerts();
  const { data: patients } = useAllPatients();
  
  // Get top 6 patients by latest activity (or just random 6 for UI)
  const patientIds = patients.slice(0, 6).map(p => p.userId as string);
  const { data: latestEcgMap } = useLatestECGPerPatient(patientIds);
  const { getToken } = useAuth();

  const handleResolveAlert = async (alertId: string) => {
    try {
      // Direct Firebase write to resolve (since we are admin)
      const { ref, set } = await import('firebase/database');
      const { db } = await import('@/lib/firebase');
      await set(ref(db, `alerts/${alertId}/status`), 'resolved');
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  if (statsLoading) {
    return (
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 shimmer rounded-2xl" />)}
      </div>
    );
  }

  // Mock bar chart data for 'Alerts - Last 30 Days'
  const barData = Array.from({ length: 7 }).map((_, i) => ({
    name: format(new Date(Date.now() - (6 - i) * 86400000), 'MMM dd'),
    count: Math.floor(Math.random() * 8) + 1
  }));

  // Pie chart data
  const pieData = [
    { name: 'Cardiac', value: 45, color: '#E05252' },
    { name: 'Seizure', value: 25, color: '#D4943A' },
    { name: 'Panic', value: 15, color: '#E8C438' },
    { name: 'Parkinson', value: 10, color: '#5B9BD5' },
    { name: 'PTSD', value: 5, color: '#9B7EC8' },
  ];

  return (
    <div className="space-y-6">
      
      {/* STAT CARDS ROW */}
      <motion.div 
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        initial="hidden" animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard
          label="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          subtext="+2 this week"
          iconColorClass="text-[#5B9BD5]"
        />
        <StatCard
          label="Active Alerts"
          value={stats.activeAlerts}
          icon={AlertTriangle}
          subtext="Requires immediate attention"
          isAlert={stats.activeAlerts > 0}
          iconColorClass={stats.activeAlerts > 0 ? 'text-[#E05252]' : 'text-[#7A8A76]'}
        />
        <StatCard
          label="Avg System BPM"
          value={stats.avgBpm}
          icon={Heart}
          subtext="Across all connected devices"
          iconColorClass="text-[#D4B896]"
        />
        <StatCard
          label="Critical Today"
          value={stats.criticalToday}
          icon={Zap}
          subtext="Resolved emergencies"
          iconColorClass={stats.criticalToday > 0 ? 'text-[#D4943A]' : 'text-[#7A8A76]'}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* LIVE ALERT FEED */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="font-poppins font-semibold text-xl text-[#F0E6D3]">Live Alerts</h2>
            {activeAlerts.length > 0 && <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E05252] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E05252]"></span>
            </span>}
            <span className="bg-[#1C2B1E] border border-[rgba(212,184,150,0.2)] text-[#D4B896] text-xs px-2.5 py-1 rounded-full font-mono-data">
              {activeAlerts.length}
            </span>
          </div>
          
          <AnimatePresence>
            {activeAlerts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="card-style flex flex-col items-center justify-center py-16 text-center border-dashed"
              >
                <div className="bg-[rgba(92,184,92,0.1)] p-4 rounded-full mb-4">
                  <CheckCircle className="h-10 w-10 text-[#5CB85C]" />
                </div>
                <h3 className="font-poppins font-semibold text-xl text-[#F0E6D3] mb-1">All Clear</h3>
                <p className="text-[#9BA897]">No active alerts right now.</p>
              </motion.div>
            ) : (
              activeAlerts.map(alert => {
                const pInfo = patients.find(p => p.userId === alert.userId);
                const typeInfo = classifyAlertType(alert.type);
                const timeAgo = Math.floor((Date.now() - alert.createdAt) / 60000);
                
                return (
                  <motion.div 
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
                    className="card-style flex flex-col sm:flex-row items-center justify-between p-4 border-l-4 pr-5 transition-shadow hover:shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                    style={{ borderLeftColor: typeInfo.color }}
                  >
                    <div className="flex items-center space-x-4 flex-1 mb-4 sm:mb-0">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center font-poppins font-bold text-lg" 
                           style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}>
                        {(pInfo?.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h4 className="font-poppins font-medium text-[#F0E6D3]">{(pInfo?.name ?? 'Unknown')}</h4>
                        <span className="text-xs text-[#7A8A76]">{(pInfo?.role ?? 'patient')}</span>
                        <span className="text-xs text-[#9BA897]">{timeAgo === 0 ? 'Just now' : `${timeAgo} min ago`}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-1 justify-center sm:justify-start">
                       <span className="font-poppins font-semibold text-[15px]" style={{ color: typeInfo.color }}>
                         {typeInfo.label}
                       </span>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto mt-4 sm:mt-0 justify-end">
                      <button 
                        onClick={() => handleResolveAlert(alert.id)}
                        className="bg-[#4A6741] hover:bg-[#5B7F52] text-[#F2E8D9] font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="h-4 w-4" /> <span>Mark Safe</span>
                      </button>
                      {pInfo?.phone && (
                        <a href={`tel:${pInfo?.phone ?? ''}`} className="bg-[rgba(212,184,150,0.1)] hover:bg-[rgba(212,184,150,0.2)] text-[#D4B896] p-2 rounded-lg transition-colors">
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      <a href={`/dashboard/ecg?userId=${alert.userId}`} className="border border-[rgba(212,184,150,0.3)] hover:border-[#D4B896] text-[#D4B896] p-2 rounded-lg transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>

        {/* PATIENT ACTIVITY MINIS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 mb-2">
            <h2 className="font-poppins font-semibold text-xl text-[#F0E6D3]">Patient Activity</h2>
            <div className="w-2 h-2 bg-[#4CAF78] rounded-full live-dot ml-2"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {patientIds.map(id => {
              const p = patients.find(p => p.userId === id);
              const data = latestEcgMap.get(id) || [];
              const currentBpm = data.length > 0 ? data[data.length - 1].bpm : '--';
              const sColor = currentBpm === '--' ? '#9BA897' : calculateBpmStatus(currentBpm as number) === 'normal' ? '#4CAF78' : calculateBpmStatus(currentBpm as number) === 'warning' ? '#D4943A' : '#E05252';

              return (
                <motion.div 
                  key={id} 
                  whileHover={{ scale: 1.02 }}
                  className="card-style p-3 flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start z-10">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-[rgba(212,184,150,0.1)] text-[#D4B896] flex items-center justify-center text-[10px] font-bold">
                        {(p?.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm font-medium text-[#F0E6D3] truncate max-w-[80px]">
                        {(p?.name ?? 'Unknown')}
                      </span>
                    </div>
                    <span className="font-mono-data text-lg font-bold" style={{ color: sColor }}>
                      {currentBpm}
                    </span>
                  </div>
                  
                  {/* Miniature Chart Background */}
                  <div className="absolute inset-x-0 bottom-0 h-16 opacity-40">
                    <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
                    <ResponsiveContainer width="100%" height={80} minWidth={100}>
                      <AreaChart data={data.slice(-20)}>
                        <Area 
                          type="monotone" 
                          dataKey="bpm" 
                          stroke={sColor} 
                          fill={sColor} 
                          fillOpacity={0.1}
                          strokeWidth={2}
                          isAnimationActive={true}
                          animationDuration={600}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM ANALYTICS GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        <div className="card-style p-5">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-poppins font-medium text-[#F0E6D3]">Alerts — Last 7 Days</h3>
           </div>
           <div className="h-64">
             <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
             <ResponsiveContainer width="100%" height={240} minWidth={100}>
               <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7A8A76', fontSize: 12 }} dy={10} />
                 <Tooltip 
                   cursor={{ fill: 'rgba(212,184,150,0.05)' }}
                   contentStyle={{ backgroundColor: '#1C2B1E', border: '1px solid rgba(212,184,150,0.2)', borderRadius: '12px', color: '#F0E6D3' }}
                   itemStyle={{ color: '#D4B896', fontFamily: 'JetBrains Mono' }}
                 />
                 <Bar dataKey="count" fill="#D4B896" radius={[4, 4, 0, 0]} barSize={32}>
                   {barData.map((entry, index) => (
                     <Cell key={`cell-${index}`} className="hover:opacity-80 transition-opacity cursor-pointer" />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
             </div>
           </div>
        </div>

        <div className="card-style p-5">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-poppins font-medium text-[#F0E6D3]">Alert Breakdown</h3>
             <button className="text-[#9BA897] hover:text-[#D4B896] p-1">
               <Download className="w-4 h-4" />
             </button>
           </div>
           
           <div className="h-64 flex relative">
             <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
             <ResponsiveContainer width="100%" height={240} minWidth={100}>
               <PieChart>
                 <Pie
                   data={pieData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={90}
                   paddingAngle={4}
                   dataKey="value"
                   stroke="none"
                 >
                   {pieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#1C2B1E', border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                   itemStyle={{ color: '#F0E6D3', fontFamily: 'JetBrains Mono' }}
                 />
                 <Legend 
                   verticalAlign="middle" 
                   align="right"
                   layout="vertical"
                   iconType="circle"
                   wrapperStyle={{ color: '#F0E6D3', fontSize: '13px' }}
                 />
               </PieChart>
             </ResponsiveContainer>
             </div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-32">
                <div className="text-center">
                  <span className="block font-mono-data text-2xl font-bold text-[#F0E6D3]">
                    {pieData.reduce((a, b) => a + b.value, 0)}
                  </span>
                  <span className="text-[10px] text-[#7A8A76] uppercase tracking-wider">Total</span>
                </div>
             </div>
           </div>
        </div>

      </div>

    </div>
  );
}
