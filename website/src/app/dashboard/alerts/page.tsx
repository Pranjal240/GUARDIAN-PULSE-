'use client';

import { useAllAlerts, useAllPatients } from '@/lib/firebase-hooks';
import ActiveAlertCard from '@/components/ActiveAlertCard';
import * as Tabs from '@radix-ui/react-tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function AlertsPage() {
  const { data: allAlerts, loading: aLoading } = useAllAlerts(30);
  const { data: patients, loading: pLoading } = useAllPatients();

  if (aLoading || pLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-40 shimmer rounded-2xl" />)}
      </div>
    );
  }

  const activeAlerts = allAlerts.filter(a => a.status !== 'resolved');
  const resolvedAlerts = allAlerts.filter(a => a.status === 'resolved');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-poppins font-bold text-3xl text-[#F0E6D3] mb-2">Alert Management</h1>
          <p className="text-[#9BA897]">Monitor, manage, and resolve critical incidents.</p>
        </div>
      </div>

      <Tabs.Root defaultValue="active" className="flex flex-col h-full">
        <Tabs.List className="flex space-x-2 mb-6">
          <Tabs.Trigger 
            value="active"
            className="px-6 py-3 rounded-full bg-[#1C2B1E] text-[#9BA897] data-[state=active]:bg-[#D4B896] data-[state=active]:text-[#141A14] font-semibold transition-colors flex items-center space-x-2 border border-[#2A3D2E] data-[state=active]:border-transparent"
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Active Alerts</span>
            {activeAlerts.length > 0 && (
              <span className="ml-2 bg-[#E05252] text-white text-xs px-2 py-0.5 rounded-full font-mono-data animate-pulse">
                {activeAlerts.length}
              </span>
            )}
          </Tabs.Trigger>

          <Tabs.Trigger 
            value="resolved"
            className="px-6 py-3 rounded-full bg-[#1C2B1E] text-[#9BA897] data-[state=active]:bg-[rgba(212,184,150,0.1)] data-[state=active]:text-[#D4B896] font-semibold transition-colors flex items-center space-x-2 border border-[#2A3D2E] data-[state=active]:border-[#D4B896]"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Resolved History</span>
            <span className="ml-2 opacity-50 font-mono-data">{resolvedAlerts.length}</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="active" className="outline-none space-y-4">
          <AnimatePresence>
            {activeAlerts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="card-style flex flex-col items-center justify-center py-24 text-center border-dashed"
              >
                <div className="bg-[rgba(92,184,92,0.1)] p-5 rounded-full mb-4">
                  <CheckCircle className="h-12 w-12 text-[#5CB85C]" />
                </div>
                <h3 className="font-poppins font-semibold text-2xl text-[#F0E6D3] mb-2">All Clear</h3>
                <p className="text-[#9BA897]">There are no active alerts requiring attention.</p>
              </motion.div>
            ) : (
              activeAlerts.map(alert => (
                <ActiveAlertCard key={alert.id} alert={alert} patient={patients.find(p => p.userId === alert.userId)} />
              ))
            )}
          </AnimatePresence>
        </Tabs.Content>

        <Tabs.Content value="resolved" className="outline-none space-y-4">
          <AnimatePresence>
            {resolvedAlerts.length === 0 ? (
              <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 className="card-style flex flex-col items-center justify-center py-24 text-center border-dashed"
              >
                <p className="text-[#9BA897]">No resolved alerts in the last 30 days.</p>
              </motion.div>
            ) : (
              resolvedAlerts.map(alert => (
                <ActiveAlertCard key={alert.id} alert={alert} patient={patients.find(p => p.userId === alert.userId)} />
              ))
            )}
          </AnimatePresence>
        </Tabs.Content>

      </Tabs.Root>
    </div>
  );
}
