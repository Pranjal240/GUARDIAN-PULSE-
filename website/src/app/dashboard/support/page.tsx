'use client';

import { useState, useRef, useEffect } from 'react';
import { useAllPatients, useChatMessages } from '@/lib/firebase-hooks';
import { Search, Phone, Video, MessageSquare, AlertTriangle, FileText, CheckCircle, Clock, Zap, Send, Info } from 'lucide-react';
import { ref, push, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function SupportChatPage() {
  const { data: patients } = useAllPatients();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'open' | 'all'>('open');
  const [search, setSearch] = useState('');
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  
  const { data: messages } = useChatMessages(activePatientId || '');
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const supportPatients = patients.filter(p => activeTab === 'all' || p.needsSupport);
  const filteredPatients = supportPatients.filter(p => 
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
      
      setActivePatientId(null);
    } catch (err) {
      console.error('Failed to resolve support', err);
    }
  };

  return (
    <div className="flex bg-[#141A14] card-style overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      
      {/* LEFT PANEL */}
      <div className="w-80 border-r border-[rgba(212,184,150,0.08)] bg-[#1A2620] flex flex-col">
        <div className="p-4 border-b border-[rgba(212,184,150,0.08)]">
          <div className="flex space-x-2 bg-[#111811] p-1 rounded-xl border border-[#2A3D2E] mb-4">
            <button 
              onClick={() => setActiveTab('open')}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'open' ? 'bg-[#2A3D2E] text-[#D4B896]' : 'text-[#7A8A76] hover:text-[#9BA897]'}`}
            >
              Open Requests
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
              className="w-full bg-[#141A14] text-[#F0E6D3] text-sm border border-[#2A3D2E] rounded-lg pl-9 pr-3 py-2 outline-none focus:border-[#D4B896]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredPatients.map(p => (
            <button
              key={p.userId}
              onClick={() => setActivePatientId(p.userId || null)}
              className={`w-full text-left p-4 border-b border-[rgba(212,184,150,0.05)] transition-colors flex items-center space-x-3 ${
                activePatientId === p.userId ? 'bg-[rgba(212,184,150,0.08)]' : 'hover:bg-[#223026]'
              }`}
            >
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-[rgba(212,184,150,0.15)] flex items-center justify-center text-[#D4B896] font-bold">
                  {(p.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
                </div>
                {p.needsSupport && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#E05252] rounded-full border-2 border-[#1A2620]"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold truncate ${activePatientId === p.userId ? 'text-[#D4B896]' : 'text-[#F0E6D3]'}`}>
                  {p.name || 'Unknown'}
                </h4>
                <p className="text-xs text-[#7A8A76] truncate">{(p?.phone ?? '') || 'No phone'}</p>
              </div>
            </button>
          ))}
          {filteredPatients.length === 0 && (
            <div className="p-6 text-center text-[#7A8A76] text-sm italic">No patients found.</div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-[#111811]">
        {activePatient ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-[rgba(212,184,150,0.1)] bg-[#1C2B1E] flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-[rgba(212,184,150,0.15)] flex items-center justify-center text-[#D4B896] font-bold">
                  {(activePatient.name ?? '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="font-poppins font-medium text-[#F0E6D3] truncate">{(activePatient?.name ?? 'Unknown')}</h4>
                  <p className="text-xs text-[#4CAF78] font-medium tracking-wide border border-[#4CAF78] rounded-full px-2 py-0.5 inline-block mt-0.5">Active Monitoring</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                 {activePatient.needsSupport && (
                   <button 
                     onClick={handleEndSupport}
                     className="bg-[rgba(92,184,92,0.15)] hover:bg-[rgba(92,184,92,0.25)] text-[#5CB85C] border border-[#5CB85C] px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                   >
                     <CheckCircle className="w-4 h-4" />
                     <span>Resolve Issue</span>
                   </button>
                 )}
                 <a href={`tel:${activePatient?.phone ?? ''}`} className="p-2 bg-[rgba(212,184,150,0.1)] hover:bg-[rgba(212,184,150,0.2)] text-[#D4B896] rounded-lg transition-colors">
                   <Phone className="w-5 h-5" />
                 </a>
                 <button className="p-2 bg-[rgba(212,184,150,0.1)] hover:bg-[rgba(212,184,150,0.2)] text-[#D4B896] rounded-lg transition-colors">
                   <Info className="w-5 h-5" />
                 </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {messages.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-[#7A8A76]">
                    <div className="bg-[#1C2B1E] p-4 rounded-full mb-4">
                      <Search className="w-8 h-8 opacity-50" />
                    </div>
                    <p>No messages yet.</p>
                 </div>
               ) : (
                 messages.map((m, i) => {
                   const isSupport = m.sender === 'support';
                   const isSystem = m.sender === 'system' || m.sender === 'ai';
                   
                   if (isSystem) {
                     return (
                       <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={m.id} className="flex justify-center my-4">
                         <div className="bg-[#1C2B1E] border border-[rgba(212,184,150,0.1)] px-4 py-1.5 rounded-full text-xs text-[#9BA897] flex items-center space-x-2">
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
                       <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-md ${
                         isSupport 
                           ? 'bg-[#3D5738] text-[#F0E6D3] rounded-tr-sm border border-[#4A6741]' 
                           : 'bg-[#223026] text-[#F0E6D3] rounded-tl-sm border border-[rgba(212,184,150,0.08)]'
                       }`}>
                         <p className="text-sm leading-relaxed">{m.text}</p>
                         <div className={`text-[10px] mt-1.5 text-right ${isSupport ? 'text-[#9BA897]' : 'text-[#7A8A76]'}`}>
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
            <div className="p-4 bg-[#1C2B1E] border-t border-[rgba(212,184,150,0.1)]">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                 <input 
                   type="text" 
                   value={inputValue}
                   onChange={e => setInputValue(e.target.value)}
                   className="flex-1 bg-[#111811] border border-[#2A3D2E] focus:border-[#D4B896] text-[#F0E6D3] placeholder-[#5C6B58] rounded-xl px-4 py-3 outline-none transition-colors"
                   placeholder="Type a message to the patient..."
                 />
                 <button 
                   type="submit" 
                   disabled={!inputValue.trim()}
                   className="bg-[#D4B896] hover:bg-[#C4A882] disabled:opacity-50 disabled:cursor-not-allowed text-[#141A14] p-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(212,184,150,0.15)]"
                 >
                   <Send className="w-5 h-5" />
                 </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
             <div className="h-24 w-24 rounded-full bg-[rgba(212,184,150,0.05)] border border-[rgba(212,184,150,0.1)] flex items-center justify-center mb-6">
               <Info className="w-8 h-8 text-[#D4B896] opacity-50" />
             </div>
             <h2 className="font-poppins font-semibold text-2xl text-[#F0E6D3] mb-2">Guardian Support</h2>
             <p className="text-[#9BA897] max-w-sm">Select a patient from the sidebar to view their chat history or respond to a support request.</p>
          </div>
        )}
      </div>
      
    </div>
  );
}
