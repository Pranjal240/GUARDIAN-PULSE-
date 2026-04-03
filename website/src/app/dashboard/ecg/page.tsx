'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Heart, Activity, Settings, Bell, FileText, Phone, Zap } from 'lucide-react';
import { useAllPatients, useLatestECGPerPatient, Patient, calculateBpmStatus, usePatientDemoVitals } from '@/lib/firebase-hooks';
import DiagnosticReportsList from '@/components/DiagnosticReportsList';
import { Shield } from 'lucide-react';
import PatientECGCard from '@/components/PatientECGCard';
import * as Tabs from '@radix-ui/react-tabs';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function ECGMonitorPage() {
  const { data: patients, loading: pLoading } = useAllPatients();
  const patientIds = patients.map(p => p.userId as string);
  const { data: ecgMap, loading: eLoading } = useLatestECGPerPatient(patientIds);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const selectedPatient = patients.find(p => p.userId === selectedPatientId);
  const selectedEcgData = selectedPatientId ? (ecgMap.get(selectedPatientId) || []) : [];
  const vitals = usePatientDemoVitals(selectedPatientId || '');

  const handleSaveSettings = async (updates: Partial<Patient>) => {
    if (!selectedPatientId) return;
    try {
      await update(ref(db, `users/${selectedPatientId}`), updates);
      toast.success('Settings updated');
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  // Filter patients
  const filteredPatients = patients.filter(p => {
    if (search && !(p.name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    
    // Status filter
    if (statusFilter !== 'all') {
      const pEcg = ecgMap.get(p.userId || '') || [];
      const bpm = pEcg.length > 0 ? pEcg[pEcg.length - 1].bpm : 0;
      const stat = calculateBpmStatus(bpm);
      if (statusFilter !== stat) return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6 relative h-full">
      
      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-[#1C2B1E] border border-[rgba(212,184,150,0.15)] rounded-full px-6 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        
        <div className="flex items-center space-x-3 w-full sm:w-1/2 relative">
          <Search className="h-5 w-5 text-[#9BA897] absolute left-3" />
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111811] text-[#F0E6D3] placeholder-[#5C6B58] border border-[#2A3D2E] focus:border-[#D4B896] rounded-full pl-10 pr-4 py-2 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111811] text-[#D4B896] border border-[#2A3D2E] rounded-full px-4 py-2 outline-none focus:border-[#D4B896] appearance-none"
          >
            <option value="all">All Status</option>
            <option value="normal">Normal</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          
          <div className="bg-[#D4B896] text-[#141A14] font-poppins font-semibold px-4 py-2 rounded-full text-sm">
            Showing {filteredPatients.length}
          </div>
        </div>
      </div>

      {/* PATIENT GRID */}
      {pLoading || eLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 shimmer rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map(p => (
            <PatientECGCard 
              key={p.userId} 
              patient={p} 
              ecgData={ecgMap.get(p.userId || '') || []} 
              onClick={() => setSelectedPatientId(p.userId || null)}
            />
          ))}
          {filteredPatients.length === 0 && (
             <div className="col-span-full py-20 text-center text-[#7A8A76] font-inter">
               No patients match your filters.
             </div>
          )}
        </div>
      )}

      {/* SIDE PANEL MODAL */}
      <AnimatePresence>
        {selectedPatientId && selectedPatient && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedPatientId(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-[#141A14] border-l border-[rgba(212,184,150,0.15)] shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-[rgba(212,184,150,0.1)] flex justify-between items-center bg-[#1A2620]">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-[rgba(212,184,150,0.1)] text-[#D4B896] font-poppins font-bold text-xl flex items-center justify-center">
                    {(selectedPatient.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="font-poppins font-semibold text-2xl text-[#F0E6D3] tracking-tight">
                      {(selectedPatient?.name ?? 'Unknown')}
                    </h2>
                    <p className="text-[#9BA897]">Patient ID: {(selectedPatient?.userId ?? 'N/A')}</p>
                    <p className="text-[#9BA897]">{(selectedPatient?.phone ?? 'No phone')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPatientId(null)}
                  className="p-2 hover:bg-[rgba(212,184,150,0.1)] rounded-full text-[#D4B896] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs.Root defaultValue="overview" className="flex flex-col h-full">
                  <Tabs.List className="flex border-b border-[rgba(212,184,150,0.1)] px-6 bg-[#1A2620]">
                    {['Overview', 'ECG History', 'Alerts', 'Settings', 'Notes'].map((tab) => (
                      <Tabs.Trigger 
                        key={tab.toLowerCase()} 
                        value={tab.toLowerCase()}
                        className="px-4 py-3 text-[#9BA897] hover:text-[#D4B896] data-[state=active]:text-[#D4B896] font-medium outline-none border-b-2 border-transparent data-[state=active]:border-[#D4B896] transition-colors"
                      >
                        {tab}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  <div className="flex-1 overflow-y-auto p-6 bg-[#141A14]">
                    
                    <Tabs.Content value="overview" className="space-y-6 outline-none">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="card-style p-4">
                           <div className="flex items-center space-x-2 text-[#9BA897] mb-2"><Heart className="w-4 h-4"/> <span>Current BPM</span></div>
                           <div className="font-mono-data text-4xl text-[#F0E6D3]">
                             {selectedEcgData.length > 0 ? selectedEcgData[selectedEcgData.length-1].bpm : '--'}
                           </div>
                         </div>
                         <div className="card-style p-4">
                           <div className="flex items-center space-x-2 text-[#9BA897] mb-2"><Activity className="w-4 h-4"/> <span>Status</span></div>
                           <div className="font-poppins font-semibold text-xl text-[#4CAF78] uppercase">
                             {calculateBpmStatus(selectedEcgData.length > 0 ? selectedEcgData[selectedEcgData.length-1].bpm : 70)}
                           </div>
                         </div>
                      </div>

                      <div className="card-style p-5">
                         <h3 className="font-poppins text-[#D4B896] mb-4 flex items-center"><Phone className="w-5 h-5 mr-2"/> Emergency Contacts</h3>
                         <div className="bg-[#111811] p-3 rounded-xl border border-[rgba(212,184,150,0.1)] flex justify-between items-center">
                            <div>
                               <p className="text-[#F0E6D3] font-medium">Primary Contact</p>
                               <p className="text-[#7A8A76] text-sm">+1 (555) 123-4567</p>
                            </div>
                            <a href="tel:5551234567" className="bg-[#4A6741] text-[#F0E6D3] px-3 py-1.5 rounded-lg text-sm">Call</a>
                         </div>
                      </div>

                      {/* Diagnostic Reports linked with Dashboard */}
                      <div className="bg-[#141E18] rounded-2xl p-5 border border-[rgba(212,184,150,0.1)]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-[#D4B896]" />
                            <h4 className="font-poppins font-semibold text-sm text-[#F0E6D3]">Diagnostic Reports</h4>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 bg-[rgba(76,175,120,0.1)] text-[#4CAF78] border border-[#4CAF78]/30 rounded-full font-bold uppercase tracking-wider">Synced • Live</span>
                        </div>
                        {vitals ? (
                          <DiagnosticReportsList vitals={vitals} />
                        ) : (
                          <div className="text-center py-8">
                             <div className="w-6 h-6 border-2 border-[#4CAF78] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                             <p className="text-xs text-[#9BA897]">Syncing live vitals from device...</p>
                          </div>
                        )}
                      </div>
                    </Tabs.Content>

                    <Tabs.Content value="ecg history" className="space-y-4 outline-none">
                       <div className="flex space-x-2 mb-4">
                         {['LIVE', '1H', '24H', '7D', '30D'].map(p => (
                           <button key={p} className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1C2B1E] text-[#9BA897] border border-[#2A3D2E] hover:border-[#D4B896] hover:text-[#D4B896]">
                             {p}
                           </button>
                         ))}
                       </div>
                       
                       <div className="card-style p-4 h-64 border border-[#3D5738]">
                         <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
                         <ResponsiveContainer width="100%" height={240} minWidth={100}>
                           <LineChart data={selectedEcgData}>
                             <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,184,150,0.1)" vertical={false} />
                             <XAxis dataKey="timestamp" tickFormatter={(t) => format(new Date(t), 'HH:mm:ss')} stroke="#7A8A76" fontSize={12} tickMargin={10} />
                             <YAxis domain={['auto', 'auto']} stroke="#7A8A76" fontSize={12} width={30} />
                             <Tooltip 
                               contentStyle={{ background: '#1C2B1E', border: '1px solid #D4B896', borderRadius: '12px', color: '#F0E6D3' }}
                               labelFormatter={(l) => format(new Date(l), 'HH:mm:ss')}
                             />
                             <Line type="monotone" dataKey="bpm" stroke="#D4B896" strokeWidth={2} dot={false} isAnimationActive={false} />
                           </LineChart>
                         </ResponsiveContainer>
                         </div>
                       </div>
                    </Tabs.Content>

                    <Tabs.Content value="alerts" className="outline-none">
                       <div className="text-center py-12">
                         <Zap className="h-12 w-12 text-[#9BA897] mx-auto mb-4 opacity-50" />
                         <p className="text-[#9BA897]">No alerts in the last 7 days.</p>
                       </div>
                    </Tabs.Content>

                    <Tabs.Content value="settings" className="space-y-6 outline-none">
                       <div className="card-style p-5">
                          <h3 className="font-poppins text-[#F0E6D3] mb-4">Monitoring Mode</h3>
                          <div className="grid grid-cols-3 gap-3">
                            {['normal', 'sleep', 'parkinson'].map(m => (
                              <button 
                                key={m}
                                onClick={() => handleSaveSettings({ mode: m })}
                                className={`py-3 rounded-xl border font-medium capitalize transition-all ${
                                  (selectedPatient?.mode ?? 'normal') === m
                                    ? 'bg-[rgba(212,184,150,0.1)] border-[#D4B896] text-[#D4B896]'
                                    : 'bg-[#111811] border-[#2A3D2E] text-[#7A8A76] hover:border-[#5B7F52]'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                          
                          <div className="mt-8 space-y-4">
                             <div>
                               <div className="flex justify-between text-sm mb-2">
                                 <span className="text-[#F0E6D3]">Upper BPM Threshold (Critical)</span>
                                 <span className="text-[#E05252] font-mono-data">130 BPM</span>
                               </div>
                               <input type="range" min="100" max="180" defaultValue="130" className="w-full accent-[#E05252]" />
                             </div>
                             <div>
                               <div className="flex justify-between text-sm mb-2">
                                 <span className="text-[#F0E6D3]">Lower BPM Threshold (Critical)</span>
                                 <span className="text-[#E05252] font-mono-data">50 BPM</span>
                               </div>
                               <input type="range" min="30" max="70" defaultValue="50" className="w-full accent-[#E05252]" />
                             </div>
                          </div>
                          
                          <button className="mt-8 w-full btn-primary h-12">
                            Save Thresholds
                          </button>
                       </div>
                    </Tabs.Content>

                    <Tabs.Content value="notes" className="outline-none h-full flex flex-col">
                       <textarea 
                          className="flex-1 w-full bg-[#111811] border border-[#2A3D2E] rounded-xl p-4 text-[#F0E6D3] placeholder-[#5C6B58] focus:border-[#D4B896] focus:ring-1 focus:ring-[#D4B896] outline-none transition-all resize-none min-h-[300px]"
                          placeholder="Add medical notes, observations..."
                       ></textarea>
                       <button className="btn-primary mt-4 py-3">Save Notes</button>
                    </Tabs.Content>

                  </div>
                </Tabs.Root>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
