'use client';

import { useAdminRequests, AdminRequest } from '@/lib/firebase-hooks';
import { ref, set, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldX, Clock, CheckCircle, XCircle, UserCheck, Search, Filter } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminRequestsPage() {
  const { data: requests, loading } = useAdminRequests();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  const filteredPending = pendingRequests.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredHistory = historyRequests.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = async (request: AdminRequest) => {
    if (processingId) return;
    setProcessingId(request.userId);
    
    try {
      // Update user role to admin
      await update(ref(db, `users/${request.userId}`), { role: 'admin' });
      
      // Update request status
      await update(ref(db, `admin_requests/${request.userId}`), {
        status: 'approved',
        reviewedBy: user?.id || '',
        reviewedAt: Date.now(),
      });

      // Write audit log
      await set(ref(db, `audit_log/${Date.now()}_approve`), {
        action: 'admin_request_approved',
        performedBy: user?.id || '',
        performedByName: user?.fullName || 'Admin',
        targetUserId: request.userId,
        targetUserName: request.name,
        details: `Approved admin access for ${request.email}`,
        timestamp: Date.now(),
      });

      toast.success(`Approved admin access for ${request.name}`);
    } catch (err) {
      console.error('Failed to approve:', err);
      toast.error('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: AdminRequest) => {
    if (processingId) return;
    setProcessingId(request.userId);
    
    try {
      // Revert user role to patient
      await update(ref(db, `users/${request.userId}`), { role: 'patient' });
      
      // Update request status
      await update(ref(db, `admin_requests/${request.userId}`), {
        status: 'rejected',
        reviewedBy: user?.id || '',
        reviewedAt: Date.now(),
      });

      // Write audit log
      await set(ref(db, `audit_log/${Date.now()}_reject`), {
        action: 'admin_request_rejected',
        performedBy: user?.id || '',
        performedByName: user?.fullName || 'Admin',
        targetUserId: request.userId,
        targetUserName: request.name,
        details: `Rejected admin access for ${request.email}`,
        timestamp: Date.now(),
      });

      toast.success(`Rejected request from ${request.name}`);
    } catch (err) {
      console.error('Failed to reject:', err);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8"
      >
        <div>
          <h1 className="font-poppins font-bold text-3xl text-[#F0E6D3] mb-2 flex items-center gap-3">
            <div className="p-2 bg-[rgba(212,184,150,0.1)] rounded-xl">
              <ShieldCheck className="w-7 h-7 text-[#D4B896]" />
            </div>
            Admin Requests
          </h1>
          <p className="text-[#9BA897]">Review and manage admin access requests.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6B58]" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-olive pl-9 w-full"
          />
        </div>
      </motion.div>

      <Tabs.Root defaultValue="pending" className="space-y-6">
        <Tabs.List className="flex space-x-2">
          <Tabs.Trigger
            value="pending"
            className="px-6 py-3 rounded-full bg-[#1C2B1E] text-[#9BA897] data-[state=active]:bg-[#D4B896] data-[state=active]:text-[#141A14] font-semibold transition-all flex items-center space-x-2 border border-[#2A3D2E] data-[state=active]:border-transparent hover:bg-[#243028]"
          >
            <Clock className="w-5 h-5" />
            <span>Pending</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1 bg-[#E05252] text-white text-xs px-2 py-0.5 rounded-full font-mono animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </Tabs.Trigger>

          <Tabs.Trigger
            value="history"
            className="px-6 py-3 rounded-full bg-[#1C2B1E] text-[#9BA897] data-[state=active]:bg-[rgba(212,184,150,0.1)] data-[state=active]:text-[#D4B896] font-semibold transition-all flex items-center space-x-2 border border-[#2A3D2E] data-[state=active]:border-[#D4B896] hover:bg-[#243028]"
          >
            <Filter className="w-5 h-5" />
            <span>History</span>
            <span className="ml-1 opacity-50 font-mono">{historyRequests.length}</span>
          </Tabs.Trigger>
        </Tabs.List>

        {/* Pending Tab */}
        <Tabs.Content value="pending" className="outline-none space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredPending.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card-style flex flex-col items-center justify-center py-24 text-center border-dashed"
              >
                <div className="bg-[rgba(92,184,92,0.1)] p-5 rounded-full mb-4">
                  <CheckCircle className="h-12 w-12 text-[#5CB85C]" />
                </div>
                <h3 className="font-poppins font-semibold text-2xl text-[#F0E6D3] mb-2">All Clear</h3>
                <p className="text-[#9BA897]">No pending admin requests at this time.</p>
              </motion.div>
            ) : (
              filteredPending.map((request, index) => (
                <motion.div
                  key={request.userId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-style p-5 hover-float"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* User info */}
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        {request.avatarUrl ? (
                          <img src={request.avatarUrl} alt={request.name} className="w-14 h-14 rounded-full border-2 border-[rgba(212,184,150,0.2)]" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[rgba(212,184,150,0.1)] flex items-center justify-center text-[#D4B896] font-bold text-lg">
                            {request.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#5B9BD5] rounded-full flex items-center justify-center border-2 border-[#1C2B1E]">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-poppins font-semibold text-[#F0E6D3] text-lg">{request.name}</h4>
                        <p className="text-[#7A8A76] text-sm">{request.email}</p>
                        <p className="text-[#5C6B58] text-xs mt-1 font-mono">
                          Requested {format(new Date(request.requestedAt), 'MMM d, yyyy · h:mm a')}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={processingId === request.userId}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-[rgba(76,175,120,0.12)] hover:bg-[rgba(76,175,120,0.25)] text-[#4CAF78] border border-[rgba(76,175,120,0.3)] rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(76,175,120,0.15)]"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        disabled={processingId === request.userId}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-[rgba(224,82,82,0.08)] hover:bg-[rgba(224,82,82,0.18)] text-[#E05252] border border-[rgba(224,82,82,0.2)] rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(224,82,82,0.1)]"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </Tabs.Content>

        {/* History Tab */}
        <Tabs.Content value="history" className="outline-none space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="card-style flex flex-col items-center justify-center py-24 text-center border-dashed">
              <p className="text-[#9BA897]">No request history yet.</p>
            </div>
          ) : (
            filteredHistory.map((request, index) => (
              <motion.div
                key={request.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="card-style p-5"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {request.avatarUrl ? (
                        <img src={request.avatarUrl} alt={request.name} className="w-12 h-12 rounded-full opacity-70" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[rgba(212,184,150,0.05)] flex items-center justify-center text-[#7A8A76] font-bold">
                          {request.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-poppins font-medium text-[#F0E6D3]">{request.name}</h4>
                      <p className="text-[#7A8A76] text-sm">{request.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      request.status === 'approved' 
                        ? 'badge-normal' 
                        : 'badge-critical'
                    }`}>
                      {request.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span className="capitalize">{request.status}</span>
                    </span>
                    {request.reviewedAt && (
                      <span className="text-[#5C6B58] text-xs font-mono">
                        {format(new Date(request.reviewedAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
