'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAllPatients, useChatMessages, ChatMessage } from '@/lib/firebase-hooks';
import { Search, Phone, MessageSquare, CheckCircle, Clock, Zap, Send, Info, ArrowLeft, LifeBuoy, X, MapPin, Trash2, ImagePlus, ZoomIn } from 'lucide-react';
import { ref, push, update, onValue, query, orderByChild, equalTo, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ImageLightbox from '@/components/ImageLightbox';
import SOSCameraViewer from '@/components/SOSCameraViewer';

// Hook: get patient's last known location from Firebase
function usePatientLocation(userId: string) {
  const [loc, setLoc] = useState<{ lat: number; lng: number; updatedAt: number } | null>(null);
  useEffect(() => {
    if (!userId) { setLoc(null); return; }
    const locRef = ref(db, `users/${userId}/lastLocation`);
    const unsub = onValue(locRef, (snap) => {
      if (snap.exists()) setLoc(snap.val());
      else setLoc(null);
    });
    return () => unsub();
  }, [userId]);
  return loc;
}

// Hook: Get the latest chat message for each patient to show preview
function useAllChatSummaries(patientIds: string[]) {
  const [summaries, setSummaries] = useState<Map<string, { lastMsg: string; lastTime: number; count: number }>>(new Map());

  useEffect(() => {
    if (!patientIds.length) return;
    const callbacks: (() => void)[] = [];
    const map = new Map<string, { lastMsg: string; lastTime: number; count: number }>();

    patientIds.forEach(id => {
      const q = query(ref(db, 'chat_messages'), orderByChild('userId'), equalTo(id));
      const unsub = onValue(q, (snap) => {
        if (!snap.exists()) {
          map.delete(id);
        } else {
          const msgs: ChatMessage[] = [];
          snap.forEach(child => {
            msgs.push({ id: child.key || '', ...child.val() });
          });
          msgs.sort((a, b) => a.timestamp - b.timestamp);
          const lastMsg = msgs[msgs.length - 1];
          map.set(id, {
            lastMsg: lastMsg?.text || '',
            lastTime: lastMsg?.timestamp || 0,
            count: msgs.filter(m => m.sender === 'patient').length,
          });
        }
        setSummaries(new Map(map));
      });
      callbacks.push(unsub);
    });

    return () => callbacks.forEach(cb => cb());
  }, [patientIds.join(',')]);

  return summaries;
}

export default function SupportChatPage() {
  const { data: patients } = useAllPatients();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'open' | 'all'>('open');
  const [search, setSearch] = useState('');
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const { data: messages } = useChatMessages(activePatientId || '');
  const patientLocation = usePatientLocation(activePatientId || '');
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLInputElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const patientIds = useMemo(() => patients.map(p => p.userId || '').filter(Boolean), [patients]);
  const chatSummaries = useAllChatSummaries(patientIds);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // In "open" tab: show patients with needsSupport OR who have sent messages
  const supportPatients = useMemo(() => {
    return patients.filter(p => {
      if (activeTab === 'all') return true;
      // Show if needsSupport is true
      if (p.needsSupport) return true;
      // Also show if they have chat messages
      const summary = chatSummaries.get(p.userId || '');
      if (summary && summary.count > 0) return true;
      return false;
    });
  }, [patients, activeTab, chatSummaries]);

  // Sort: patients with newer messages first, then by needsSupport
  const sortedPatients = useMemo(() => {
    return [...supportPatients].sort((a, b) => {
      const aTime = chatSummaries.get(a.userId || '')?.lastTime || 0;
      const bTime = chatSummaries.get(b.userId || '')?.lastTime || 0;
      if (bTime !== aTime) return bTime - aTime;
      if (a.needsSupport && !b.needsSupport) return -1;
      if (!a.needsSupport && b.needsSupport) return 1;
      return 0;
    });
  }, [supportPatients, chatSummaries]);

  const filteredPatients = sortedPatients.filter(p => 
    (p.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const activePatient = patients.find(p => p.userId === activePatientId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activePatientId || !user) return;
    
    try {
      await push(ref(db, 'chat_messages'), {
        userId: activePatientId,
        sender: 'support',
        text: inputValue.trim(),
        timestamp: Date.now()
      });
      setInputValue('');
    } catch (err) {
      console.error('Failed to send message', err);
      toast.error('Failed to send message');
    }
  };

  const handleEndSupport = async () => {
    if (!activePatientId) return;
    try {
      await update(ref(db, `users/${activePatientId}`), { needsSupport: false });
      
      // Auto-send resolution message
      await push(ref(db, 'chat_messages'), {
        userId: activePatientId,
        sender: 'system',
        text: 'Support session marked as resolved by admin.',
        timestamp: Date.now()
      });
      
      toast.success('Support session resolved');
      setActivePatientId(null);
      setShowMobileChat(false);
    } catch (err) {
      console.error('Failed to resolve support', err);
      toast.error('Failed to resolve');
    }
  };

  // Clear all chat messages for active patient
  const handleClearChat = async () => {
    if (!activePatientId) return;
    if (!confirm('Clear entire chat history for this patient? This cannot be undone.')) return;
    try {
      // Delete all chat messages for this user
      const chatRef = ref(db, 'chat_messages');
      const q = query(chatRef, orderByChild('userId'), equalTo(activePatientId));
      const { get } = await import('firebase/database');
      const snap = await get(q);
      const updates: Record<string, null> = {};
      snap.forEach(child => { updates[`chat_messages/${child.key}`] = null; });
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }
      toast.success('Chat history cleared');
    } catch (err) {
      console.error('Failed to clear chat', err);
      toast.error('Failed to clear chat');
    }
  };

  // Media upload handler (compress image to base64 data URL)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePatientId || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        // Compress using canvas
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          await push(ref(db, 'chat_messages'), {
            userId: activePatientId,
            sender: 'support',
            text: '🖼️ Image shared by admin',
            mediaUrl: dataUrl,
            timestamp: Date.now(),
          });
          toast.success('Image sent');
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Failed to upload image');
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectPatient = (id: string | null) => {
    setActivePatientId(id);
    if (id) setShowMobileChat(true);
  };

  // Count patients with open support requests
  const openCount = patients.filter(p => {
    if (p.needsSupport) return true;
    const summary = chatSummaries.get(p.userId || '');
    return summary && summary.count > 0;
  }).length;

  return (
    <div className="flex bg-[#141A14] card-style overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      
      {/* LEFT PANEL — Patient List */}
      <div className={`w-full md:w-80 border-r border-[rgba(212,184,150,0.08)] bg-[#1A2620] flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[rgba(212,184,150,0.08)]">
          <div className="flex space-x-2 bg-[#111811] p-1 rounded-xl border border-[#2A3D2E] mb-4">
            <button 
              onClick={() => setActiveTab('open')}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'open' ? 'bg-[#2A3D2E] text-[#D4B896]' : 'text-[#7A8A76] hover:text-[#9BA897]'}`}
            >
              Open
              {openCount > 0 && (
                <span className="bg-[#E05252] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold">
                  {openCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'all' ? 'bg-[#2A3D2E] text-[#D4B896]' : 'text-[#7A8A76] hover:text-[#9BA897]'}`}
            >
              All Patients
            </button>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#5C6B58]" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141A14] text-[#F0E6D3] text-sm border border-[#2A3D2E] rounded-lg pl-9 pr-3 py-2 outline-none focus:border-[#D4B896] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredPatients.map(p => {
            const summary = chatSummaries.get(p.userId || '');
            const hasMessages = summary && summary.count > 0;
            
            return (
              <button
                key={p.userId}
                onClick={() => selectPatient(p.userId || null)}
                className={`w-full text-left p-4 border-b border-[rgba(212,184,150,0.05)] transition-colors flex items-center space-x-3 ${
                  activePatientId === p.userId ? 'bg-[rgba(212,184,150,0.08)]' : 'hover:bg-[#223026]'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-[rgba(212,184,150,0.15)] flex items-center justify-center text-[#D4B896] font-bold text-sm">
                    {(p.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  {p.needsSupport && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#E05252] rounded-full border-2 border-[#1A2620] animate-pulse"></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-semibold truncate ${activePatientId === p.userId ? 'text-[#D4B896]' : 'text-[#F0E6D3]'}`}>
                      {p.name || 'Unknown'}
                    </h4>
                    {summary?.lastTime ? (
                      <span className="text-[10px] text-[#7A8A76] shrink-0 ml-2">
                        {format(summary.lastTime, 'h:mm a')}
                      </span>
                    ) : null}
                  </div>
                  {/* Show last message preview */}
                  {summary?.lastMsg ? (
                    <p className="text-xs text-[#7A8A76] truncate mt-0.5">{summary.lastMsg}</p>
                  ) : (
                    <p className="text-xs text-[#5C6B58] italic mt-0.5">No messages yet</p>
                  )}
                  {/* Status badges */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {p.needsSupport && (
                      <span className="text-[9px] font-bold text-[#E05252] bg-[#E05252]/10 border border-[#E05252]/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Needs Help
                      </span>
                    )}
                    {hasMessages && !p.needsSupport && (
                      <span className="text-[9px] font-bold text-[#D4B896] bg-[#D4B896]/10 border border-[#D4B896]/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Chat Active
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredPatients.length === 0 && (
            <div className="p-6 text-center space-y-3">
              <LifeBuoy className="w-8 h-8 text-[#5C6B58] mx-auto" />
              <p className="text-[#7A8A76] text-sm">
                {activeTab === 'open' ? 'No open support requests.' : 'No patients found.'}
              </p>
              {activeTab === 'open' && (
                <button onClick={() => setActiveTab('all')} className="text-[#D4B896] text-xs underline hover:text-[#C4A882]">
                  View all patients
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Chat */}
      <div className={`flex-1 flex flex-col bg-[#111811] ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
        {activePatient ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-[rgba(212,184,150,0.1)] bg-[#1C2B1E] flex items-center justify-between px-4 md:px-6 shrink-0">
              <div className="flex items-center space-x-3 md:space-x-4">
                {/* Mobile back button */}
                <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1.5 hover:bg-[rgba(212,184,150,0.1)] rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-[#D4B896]" />
                </button>
                <div className="h-10 w-10 rounded-full bg-[rgba(212,184,150,0.15)] flex items-center justify-center text-[#D4B896] font-bold">
                  {(activePatient.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="font-poppins font-medium text-[#F0E6D3] truncate">{(activePatient?.name ?? 'Unknown')}</h4>
                  <div className="flex items-center gap-2">
                    {activePatient.needsSupport ? (
                      <span className="text-[10px] text-[#E05252] font-bold uppercase tracking-wide border border-[#E05252]/40 rounded-full px-2 py-0.5 inline-block bg-[#E05252]/10">
                        🔴 Needs Support
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#4CAF78] font-medium tracking-wide border border-[#4CAF78] rounded-full px-2 py-0.5 inline-block">
                        Active Monitoring
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 md:space-x-3">
                 {/* Location badge */}
                 {patientLocation && (
                   <a
                     href={`https://www.google.com/maps?q=${patientLocation.lat},${patientLocation.lng}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[rgba(76,175,120,0.1)] hover:bg-[rgba(76,175,120,0.2)] text-[#4CAF78] border border-[#4CAF78]/30 rounded-lg transition-colors text-xs font-medium"
                     title={`${patientLocation.lat.toFixed(4)}, ${patientLocation.lng.toFixed(4)}`}
                   >
                     <MapPin className="w-3.5 h-3.5" />
                     <span className="hidden sm:inline">Location</span>
                   </a>
                 )}
                 {activePatient.needsSupport && (
                   <button 
                     onClick={handleEndSupport}
                     className="bg-[rgba(92,184,92,0.15)] hover:bg-[rgba(92,184,92,0.25)] text-[#5CB85C] border border-[#5CB85C] px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center space-x-1.5 md:space-x-2"
                   >
                     <CheckCircle className="w-4 h-4" />
                     <span className="hidden sm:inline">Resolve</span>
                   </button>
                 )}
                 <a href={`tel:${activePatient?.phone ?? ''}`} className="p-2 bg-[rgba(212,184,150,0.1)] hover:bg-[rgba(212,184,150,0.2)] text-[#D4B896] rounded-lg transition-colors">
                   <Phone className="w-5 h-5" />
                 </a>
                 <button
                   onClick={handleClearChat}
                   className="p-2 bg-[rgba(224,82,82,0.08)] hover:bg-[rgba(224,82,82,0.18)] text-[#E05252]/70 hover:text-[#E05252] rounded-lg transition-colors"
                   title="Clear chat history"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            </div>

            {/* SOS Camera Feed — shown prominently above messages */}
            {activePatientId && (
              <div className="shrink-0 px-4 py-2 bg-[#111811] border-b border-[rgba(212,184,150,0.06)]">
                <SOSCameraViewer userId={activePatientId} />
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
               {messages.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-[#7A8A76] space-y-3">
                    <div className="bg-[#1C2B1E] p-3 md:p-4 rounded-full">
                      <MessageSquare className="w-7 h-7 md:w-8 md:h-8 opacity-50" />
                    </div>
                    <p className="text-sm">No messages yet.</p>
                    <p className="text-xs text-[#5C6B58] max-w-xs text-center">The patient hasn&apos;t sent any messages. You can start the conversation by sending a message below.</p>
                 </div>
               ) : (
                 messages.map((m) => {
                   const isSupport = m.sender === 'support';
                   const isSystem = m.sender === 'system' || m.sender === 'ai';
                   
                   if (isSystem) {
                     // Check if this is a location message
                     const isLocation = m.text.includes('google.com/maps');
                     const mapsUrl = m.text.match(/(https:\/\/www\.google\.com\/maps\?q=[^\s]+)/)?.[1];
                     const isEmergencyLoc = m.text.includes('EMERGENCY LOCATION');
                     
                     if (isLocation && mapsUrl) {
                       // Extract coordinates from text
                       const coordMatch = m.text.match(/([\d.-]+),\s*([\d.-]+)/);
                       const lat = coordMatch?.[1] || '';
                       const lng = coordMatch?.[2] || '';
                       
                       return (
                         <motion.div initial={{opacity:0, y:10, scale: 0.95}} animate={{opacity:1, y:0, scale: 1}} key={m.id} className="flex justify-center my-3 md:my-4">
                           <div className={`${isEmergencyLoc ? 'bg-[#2D1515] border-[#E05252]/30' : 'bg-[#1C2B1E] border-[#4CAF78]/30'} border rounded-xl px-4 py-3 max-w-sm w-full`}>
                             <div className="flex items-center gap-2 mb-2">
                               <div className={`p-1.5 rounded-lg ${isEmergencyLoc ? 'bg-[#E05252]/15' : 'bg-[#4CAF78]/15'}`}>
                                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isEmergencyLoc ? '#E05252' : '#4CAF78'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                               </div>
                               <span className={`text-[10px] font-bold uppercase tracking-wider ${isEmergencyLoc ? 'text-[#E05252]' : 'text-[#4CAF78]'}`}>
                                 {isEmergencyLoc ? '🚨 Emergency Location' : '📍 Patient Location'}
                               </span>
                             </div>
                             <p className="text-[#9BA897] text-xs font-mono mb-2">{lat}, {lng}</p>
                             <a 
                               href={mapsUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className={`flex items-center justify-center gap-2 text-xs font-medium py-2 px-3 rounded-lg transition-colors ${
                                 isEmergencyLoc 
                                   ? 'bg-[#E05252]/15 text-[#E05252] hover:bg-[#E05252]/25 border border-[#E05252]/30' 
                                   : 'bg-[#4CAF78]/15 text-[#4CAF78] hover:bg-[#4CAF78]/25 border border-[#4CAF78]/30'
                               }`}
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                               Open in Google Maps
                             </a>
                             <p className="text-[9px] text-[#5C6B58] mt-1.5 text-right">{format(m.timestamp, 'h:mm a')}</p>
                           </div>
                         </motion.div>
                       );
                     }
                     
                     return (
                       <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={m.id} className="flex justify-center my-3 md:my-4">
                         <div className="bg-[#1C2B1E] border border-[rgba(212,184,150,0.1)] px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs text-[#9BA897] flex items-center space-x-2">
                           {m.sender === 'ai' && <Zap className="w-3 h-3 text-[#D4B896]" />}
                           <span>{m.text}</span>
                         </div>
                       </motion.div>
                     );
                   }
                   
                   return (
                     <motion.div 
                       initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} 
                       key={m.id} 
                       className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}
                     >
                       <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 md:px-5 py-2.5 md:py-3 shadow-md ${
                         isSupport 
                           ? 'bg-[#3D5738] text-[#F0E6D3] rounded-tr-sm border border-[#4A6741]' 
                           : 'bg-[#223026] text-[#F0E6D3] rounded-tl-sm border border-[rgba(212,184,150,0.08)]'
                       }`}>
                         <div className="flex items-center gap-2 mb-1">
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${isSupport ? 'text-[#4CAF78]' : 'text-[#D4B896]'}`}>
                             {isSupport ? 'Admin' : 'Patient'}
                           </span>
                         </div>
                         <p className="text-xs md:text-sm leading-relaxed">{m.text}</p>
                         {m.mediaUrl && (
                           <div
                             className="mt-2 rounded-lg overflow-hidden border border-[rgba(212,184,150,0.1)] cursor-pointer group relative"
                             onClick={() => setLightboxSrc(m.mediaUrl!)}
                           >
                             <img src={m.mediaUrl} alt="Shared media" className="max-w-full max-h-60 object-contain rounded-lg transition-transform group-hover:scale-[1.02]" loading="lazy" />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                               <div className="bg-black/50 p-2 rounded-full"><ZoomIn className="w-4 h-4 text-white" /></div>
                             </div>
                           </div>
                         )}
                         <div className={`text-[9px] md:text-[10px] mt-1.5 text-right ${isSupport ? 'text-[#9BA897]' : 'text-[#7A8A76]'}`}>
                            {format(m.timestamp, 'h:mm a')}
                         </div>
                       </div>
                     </motion.div>
                   );
                 })
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-[#1C2B1E] border-t border-[rgba(212,184,150,0.1)]">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2 md:space-x-3">
                 {/* Hidden file input */}
                 <input
                   ref={fileInputRef}
                   type="file"
                   accept="image/*"
                   onChange={handleMediaUpload}
                   className="hidden"
                 />
                 <button
                   type="button"
                   onClick={() => fileInputRef.current?.click()}
                   className="p-2.5 bg-[#111811] hover:bg-[#1C2B1E] border border-[#2A3D2E] hover:border-[#D4B896] text-[#7A8A76] hover:text-[#D4B896] rounded-xl transition-colors shrink-0"
                   title="Upload image"
                 >
                   <ImagePlus className="w-4 h-4" />
                 </button>
                 <input 
                   type="text" 
                   value={inputValue}
                   onChange={e => setInputValue(e.target.value)}
                   className="flex-1 bg-[#111811] border border-[#2A3D2E] focus:border-[#D4B896] text-[#F0E6D3] placeholder-[#5C6B58] rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none transition-colors text-xs md:text-sm"
                   placeholder="Reply to patient..."
                 />
                 <button 
                   type="submit" 
                   disabled={!inputValue.trim()}
                   className="bg-[#D4B896] hover:bg-[#C4A882] disabled:opacity-50 disabled:cursor-not-allowed text-[#141A14] p-2.5 md:p-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(212,184,150,0.15)] active:scale-95"
                 >
                   <Send className="w-4 h-4 md:w-5 md:h-5" />
                 </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
             <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-[rgba(212,184,150,0.05)] border border-[rgba(212,184,150,0.1)] flex items-center justify-center mb-4 md:mb-6">
               <MessageSquare className="w-7 h-7 md:w-8 md:h-8 text-[#D4B896] opacity-50" />
             </div>
             <h2 className="font-poppins font-semibold text-xl md:text-2xl text-[#F0E6D3] mb-2">Guardian Support</h2>
             <p className="text-[#9BA897] max-w-sm text-sm">Select a patient from the sidebar to view their chat history or respond to a support request.</p>
             {openCount > 0 && (
               <div className="mt-4 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.3)] px-4 py-2 rounded-xl">
                 <p className="text-[#E05252] text-sm font-medium">
                   ⚠ {openCount} patient{openCount > 1 ? 's' : ''} {openCount > 1 ? 'need' : 'needs'} support
                 </p>
               </div>
             )}
          </div>
        )}
      </div>
      
      {/* Image Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Shared media" onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
