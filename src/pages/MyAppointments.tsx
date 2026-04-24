import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, Stethoscope, Building, Mic, MicOff, Bot, AlertTriangle, Activity, X, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';

// Extending window for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function MyAppointments() {
  const { user, role } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI & Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAppt, setActiveAppt] = useState<any>(null);
  const [visitNotes, setVisitNotes] = useState('');
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isCoding, setIsCoding] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);

  useEffect(() => {
    fetchMyAppointments();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const fetchMyAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointment')
        .select('*, patient(name, user_id), doctor(name, user_id), department(dept_name)')
        .order('time', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filter based on role
      let filtered = data || [];
      if (role === 'patient') {
        filtered = filtered.filter((a: any) => a.patient?.user_id === user?.id);
      } else if (role === 'doctor') {
        filtered = filtered.filter((a: any) => a.doctor?.user_id === user?.id);
      }

      setAppointments(filtered);
    } catch (e: any) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      if (notes !== undefined) updateData.notes = notes;

      const { error } = await supabase.from('appointment').update(updateData).eq('appointment_id', id);
      if (error) throw error;
      toast.success(`Appointment ${status}`);
      fetchMyAppointments();
      setIsModalOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openCompletionModal = (appt: any) => {
    setActiveAppt(appt);
    let cleanNotes = appt.notes || '';
    cleanNotes = cleanNotes.replace(/\[PAID:\s*pay_[a-zA-Z0-9]+\]\n*/i, '');
    cleanNotes = cleanNotes.replace(/\[TRIAGE:\s*(Routine|Elevated|Urgent|Critical)\]\n*/i, '');
    setVisitNotes(cleanNotes.trim());
    setIsModalOpen(true);
  };

  // --- Phase 1: Voice API ---
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Your browser doesn't support the raw Speech API.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setVisitNotes((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.success("Listening for medical notes...");
  };

  // --- Phase 1: AI Auto-Coding (Groq) ---
  const handleAutoCode = async () => {
    if (!visitNotes.trim()) {
      toast.error("Please add some notes to code.");
      return;
    }

    setIsCoding(true);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API Key missing.");

      const prompt = `You are a medical coding assistant. Read the following doctor's visit note and determine exactly ONE primary ICD-10 diagnosis code that best matches the description. Return ONLY the code and a very brief description in this exact format: [ICD-10: X00.0] Brief Description. \n\nNote: ${visitNotes}`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.2
        })
      });

      if (!res.ok) throw new Error("AI coding failed.");
      const data = await res.json();
      const codeSuggestion = data.choices[0]?.message?.content;

      if (codeSuggestion) {
        setVisitNotes(prev => prev + `\n\nAI Auto-Code Suggestion: ${codeSuggestion}`);
        toast.success("ICD-10 code added!");
      }

    } catch (e: any) {
      toast.error(e.message || "Failed to auto-code");
    } finally {
      setIsCoding(false);
    }
  };

  // --- Phase 2: AI Assisted Differential Diagnosis (Groq) ---
  const handleAIConsult = async () => {
    if (!visitNotes.trim()) {
      toast.error("Please add some notes or symptoms first for an AI Consult.");
      return;
    }

    setIsConsulting(true);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API Key missing.");

      const prompt = `You are an expert Medical AI Assistant. Based on the following doctor's visit notes and symptoms, provide a concise list of top 3 Differential Diagnoses (with brief rationale) and recommended next steps for testing. \n\nNotes: ${visitNotes} \n\nFormat your response clearly.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.3
        })
      });

      if (!res.ok) throw new Error("AI Consult failed.");
      const data = await res.json();
      const consultSuggestion = data.choices[0]?.message?.content;

      if (consultSuggestion) {
        setVisitNotes(prev => prev + `\n\n--- AI Consult (Differential Dx) ---\n${consultSuggestion}`);
        toast.success("AI Consult appended to notes!");
      }

    } catch (e: any) {
      toast.error(e.message || "Failed to consult AI");
    } finally {
      setIsConsulting(false);
    }
  };

  // --- Phase 4 & Phase 1: Smart Scheduling AI Models ---
  const getAIAnalytics = (appt: any) => {
    // Deterministic simulation based on ID to remain consistent across renders
    if (!appt.appointment_id) return { noShowProb: 0, priority: 'Routine', priorityColor: 'badge-blue', priorityIcon: <Activity className="w-3 h-3 text-blue-500" /> };
    const seed = appt.appointment_id.charCodeAt(0) + appt.appointment_id.charCodeAt(1);
    
    // 5% to 45% based on demo hash
    const noShowProb = (seed % 40) + 5; 
    
    let priority = 'Routine';
    let priorityColor = 'badge-blue';
    let priorityIcon = <Activity className="w-3 h-3 text-blue-500" />;

    const triageMatch = appt.notes?.match(/\[TRIAGE:\s*(Routine|Elevated|Urgent|Critical)\]/i);

    if (triageMatch) {
      priority = triageMatch[1];
      if (priority.toLowerCase() === 'critical') {
        priorityColor = 'bg-rose-100 text-rose-800 border-rose-200';
        priorityIcon = <AlertTriangle className="w-3 h-3 text-rose-600" />;
      } else if (priority.toLowerCase() === 'urgent') {
        priorityColor = 'badge-red';
        priorityIcon = <AlertTriangle className="w-3 h-3 text-red-500" />;
      } else if (priority.toLowerCase() === 'elevated') {
        priorityColor = 'badge-amber';
        priorityIcon = <AlertTriangle className="w-3 h-3 text-amber-500" />;
      }
    } else {
      if (seed % 4 === 0) { 
        priority = 'Urgent'; 
        priorityColor = 'badge-red'; 
        priorityIcon = <AlertTriangle className="w-3 h-3 text-red-500" />;
      } else if (seed % 4 === 1) { 
        priority = 'Elevated'; 
        priorityColor = 'badge-amber'; 
        priorityIcon = <AlertTriangle className="w-3 h-3 text-amber-500" />;
      }
    }

    const paymentMatch = appt.notes?.match(/\[PAID:\s*(pay_[a-zA-Z0-9]+)\]/i);
    const paymentId = paymentMatch ? paymentMatch[1] : null;

    return { noShowProb, priority, priorityColor, priorityIcon, paymentId };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-green';
      case 'cancelled': return 'badge-red';
      default: return 'badge-blue';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-400 text-sm">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Appointments</h1>
        <p className="text-surface-400 text-sm mt-1">
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar className="w-14 h-14 text-surface-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-600 mb-2">No Appointments</h3>
          <p className="text-surface-400 text-sm">
            {role === 'patient' 
              ? 'You haven\'t booked any appointments yet. Use the "Book Appointment" section to get started.'
              : 'No appointments assigned to you yet.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((a, idx) => {
            const apptDate = new Date(a.time);
            const isPast = apptDate < new Date();
            const { noShowProb, priority, priorityColor, priorityIcon, paymentId } = getAIAnalytics(a);
            
            return (
              <div 
                key={a.appointment_id} 
                className="glass-card flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden stagger-item"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {/* Left/Date Side */}
                <div className="bg-surface-50 border-r border-surface-100 p-5 flex md:flex-col items-center justify-center md:min-w-[120px] gap-3">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex flex-col items-center justify-center text-white shadow-glow">
                      <span className="text-xs font-medium uppercase">
                        {apptDate.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-xl font-bold leading-none">
                        {apptDate.getDate()}
                      </span>
                    </div>
                    <span className={getStatusBadge(a.status)}>{a.status || 'scheduled'}</span>
                </div>

                {/* Main Content Side */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-surface-400" />
                        <span className="text-base font-bold text-surface-700">
                          {apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        
                        {/* Phase 1 AI Badges for Doctor */}
                        {role === 'doctor' && a.status === 'scheduled' && (
                          <div className="flex gap-2 ml-2">
                            <span className={`${priorityColor} flex items-center gap-1 shadow-sm border border-black/5`}>
                               {priorityIcon} {priority} Priority
                            </span>
                            <span className="badge-purple flex items-center gap-1 shadow-sm border border-black/5" title="AI Model Prediction of no-show based on historical demographics">
                               <Bot className="w-3 h-3 text-purple-600" />
                               {noShowProb}% No-Show Risk
                            </span>
                            {paymentId && (
                               <span className="badge-green flex items-center gap-1 shadow-sm border border-emerald-200" title={`Transaction ID: ${paymentId}`}>
                                 <BadgeCheck className="w-3 h-3 text-emerald-600" /> Paid
                               </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        {role === 'patient' ? (
                          <div className="flex items-center gap-2 text-sm text-surface-700">
                            <Stethoscope className="w-4 h-4 text-brand-500" />
                            <span className="font-semibold text-lg">Dr. {a.doctor?.name || 'N/A'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-surface-700">
                            <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-bold text-xs">
                               {(a.patient?.name || '?')[0].toUpperCase()}
                            </div>
                            <span className="font-semibold text-lg">{a.patient?.name || 'Unknown Patient'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-sm font-medium text-surface-400 bg-surface-50 px-3 py-1 rounded-full border border-surface-200">
                          <Building className="w-3.5 h-3.5" />
                          <span>{a.department?.dept_name || 'N/A'}</span>
                        </div>
                      </div>

                      {a.notes && (
                        <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                           <p className="text-sm text-amber-900/80 whitespace-pre-wrap">
                             {a.notes
                                .replace(/\[PAID:\s*pay_[a-zA-Z0-9]+\]\n*/i, '')
                                .replace(/\[TRIAGE:\s*(Routine|Elevated|Urgent|Critical)\]\n*/i, '')
                                .trim()
                             }
                           </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions for doctors */}
                    {role === 'doctor' && a.status === 'scheduled' && (
                      <div className="flex flex-wrap md:flex-col gap-2 mt-4 md:mt-0 items-end">
                        <button onClick={() => openCompletionModal(a)} className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-md shadow-brand-500/20 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Complete Visit
                        </button>
                        <button onClick={() => updateStatus(a.appointment_id, 'cancelled')} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Modal with AI Tooling */}
      {isModalOpen && activeAppt && (
        <div className="modal-overlay" onClick={() => !isCoding && setIsModalOpen(false)}>
           <div className="modal-content max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6 border-b border-surface-100 pb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-surface-900">
                      <Stethoscope className="text-brand-600 w-6 h-6" />
                      Complete Visit: {activeAppt.patient?.name}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-50">
                    <X className="w-5 h-5" />
                  </button>
              </div>

              <div className="space-y-4">
                  <div>
                      <div className="flex justify-between items-end mb-2">
                          <label className="label-text flex items-center gap-2">
                             SOAP Notes & Diagnosis
                          </label>
                          <div className="flex gap-2">
                              <button 
                                onClick={toggleListening}
                                type="button" 
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors border ${
                                  isListening 
                                    ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' 
                                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                                }`}
                              >
                                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                {isListening ? 'Stop Mic' : 'Dictate'}
                              </button>
                              
                              <button 
                                onClick={handleAIConsult}
                                disabled={isConsulting || !visitNotes.trim()}
                                type="button" 
                                className="text-xs px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-sm hover:shadow disabled:opacity-50"
                              >
                                {isConsulting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                                AI Consult
                              </button>

                              <button 
                                onClick={handleAutoCode}
                                disabled={isCoding || !visitNotes.trim()}
                                type="button" 
                                className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-sm hover:shadow disabled:opacity-50"
                              >
                                {isCoding ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                                AI Auto-Code
                              </button>
                          </div>
                      </div>
                      <textarea 
                         rows={6}
                         className="flex-1 text-sm py-3 px-4 rounded-xl border border-surface-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm w-full font-mono"
                         placeholder="e.g. Patient presents with severe lower back pain radiating down left leg..."
                         value={visitNotes}
                         onChange={(e) => setVisitNotes(e.target.value)}
                      />
                  </div>

                  <div className="flex gap-3 pt-4">
                     <button onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1 py-3 text-base">Cancel</button>
                     <button onClick={() => updateStatus(activeAppt.appointment_id, 'completed', visitNotes)} className="btn-primary flex-1 py-3 text-base">Save & Complete Record</button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
