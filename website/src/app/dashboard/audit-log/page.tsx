'use client';

import { useAuditLog, AuditLogEntry } from '@/lib/firebase-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText, ShieldCheck, ShieldX, AlertTriangle, CheckCircle, MessageSquare, UserPlus, Search, Filter, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const actionConfig: Record<string, { icon: typeof ShieldCheck; color: string; label: string }> = {
  admin_request_created: { icon: UserPlus, color: '#5B9BD5', label: 'Admin Request' },
  admin_request_approved: { icon: ShieldCheck, color: '#4CAF78', label: 'Admin Approved' },
  admin_request_rejected: { icon: ShieldX, color: '#E05252', label: 'Admin Rejected' },
  alert_resolved: { icon: CheckCircle, color: '#4CAF78', label: 'Alert Resolved' },
  support_resolved: { icon: MessageSquare, color: '#D4B896', label: 'Support Resolved' },
};

export default function AuditLogPage() {
  const { data: entries, loading } = useAuditLog(100);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const filtered = entries.filter(e => {
    const matchesSearch = 
      e.details.toLowerCase().includes(search.toLowerCase()) ||
      e.performedByName.toLowerCase().includes(search.toLowerCase()) ||
      (e.targetUserName || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterAction === 'all' || e.action === filterAction;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 shimmer rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-poppins font-bold text-3xl text-[#F0E6D3] mb-2 flex items-center gap-3">
          <div className="p-2 bg-[rgba(212,184,150,0.1)] rounded-xl">
            <ScrollText className="w-7 h-7 text-[#D4B896]" />
          </div>
          Audit Log
        </h1>
        <p className="text-[#9BA897]">Track all administrative actions and system events.</p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6B58]" />
          <input
            type="text"
            placeholder="Search actions, users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-olive pl-9 w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'admin_request_approved', label: 'Approved' },
            { value: 'admin_request_rejected', label: 'Rejected' },
            { value: 'admin_request_created', label: 'Requests' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterAction(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                filterAction === f.value
                  ? 'bg-[rgba(212,184,150,0.1)] border-[#D4B896] text-[#D4B896]'
                  : 'bg-[#1C2B1E] border-[#2A3D2E] text-[#9BA897] hover:bg-[#243028]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <span className="text-[#7A8A76] text-sm font-mono">{filtered.length} events</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[23px] top-0 bottom-0 w-px bg-[rgba(212,184,150,0.08)]"></div>

        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-style flex flex-col items-center justify-center py-20 text-center border-dashed ml-12"
            >
              <ScrollText className="h-10 w-10 text-[#5C6B58] mb-4" />
              <h3 className="font-poppins font-semibold text-xl text-[#F0E6D3] mb-1">No Events Found</h3>
              <p className="text-[#9BA897]">No audit log entries match your current filters.</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry, index) => {
                const config = actionConfig[entry.action] || { icon: AlertTriangle, color: '#9BA897', label: entry.action };
                const Icon = config.icon;
                const timeAgo = formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true });

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-start gap-4 group"
                  >
                    {/* Timeline node */}
                    <div className="relative z-10 flex-shrink-0">
                      <div 
                        className="w-[46px] h-[46px] rounded-full flex items-center justify-center border-2 transition-all group-hover:scale-110"
                        style={{ 
                          backgroundColor: `${config.color}15`, 
                          borderColor: `${config.color}30` 
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: config.color }} />
                      </div>
                    </div>

                    {/* Content card */}
                    <div className="flex-1 card-style p-4 group-hover:border-[rgba(212,184,150,0.25)] transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                              style={{ 
                                color: config.color, 
                                backgroundColor: `${config.color}15`,
                                border: `1px solid ${config.color}30`
                              }}
                            >
                              {config.label}
                            </span>
                          </div>
                          <p className="text-[#F0E6D3] text-sm">{entry.details}</p>
                          <p className="text-[#5C6B58] text-xs mt-1">
                            by <span className="text-[#9BA897]">{entry.performedByName || 'System'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#5C6B58] flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-mono">{timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
