import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export default function AiAdvisor() {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const fetchContext = async () => {
    setLoadingContext(true);
    try {
      const { data: patient } = await supabase
        .from('patient')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      setPatientData(patient);

      if (patient) {
        const { data: appointments } = await supabase
          .from('appointment')
          .select('appointment_id')
          .eq('patient_id', patient.patient_id);

        if (appointments && appointments.length > 0) {
          const appointmentIds = appointments.map(a => a.appointment_id);
          const { data: rxData } = await supabase
            .from('prescription')
            .select('*, appointment(time, doctor(name))')
            .in('appointment_id', appointmentIds)
            .order('prescribed_at', { ascending: false });
          
          setPrescriptions(rxData || []);
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load your medical context');
    } finally {
      setLoadingContext(false);
    }
  };

  const getSystemPrompt = () => {
    let prompt = `You are MedVault's AI Advisor, a helpful, empathetic, and knowledgeable personalized medical assistant. 
You are advising the patient directly. They are asking you for advice. Only give general advice and heavily emphasize they should consult their doctor for final decisions. Keep your responses slightly concise but informative. Emphasize diet recommendations based on their health state.

Patient Medical Profile Profile (Use to contextualize response!):
Name: ${patientData?.name || 'Unknown'}
Gender: ${patientData?.gender || 'Unknown'}
Blood Group: ${patientData?.blood_group || 'Unknown'}
Age/DOB: ${patientData?.dob || 'Unknown'}
Medical History (IMPORTANT): ${patientData?.med_history || 'None reported'}

Current Prescriptions (if any):
`;

    if (prescriptions.length === 0) {
      prompt += "No active prescriptions on record.\n";
    } else {
      prescriptions.forEach(rx => {
        prompt += `- Medication: ${rx.medication}, Dosage: ${rx.dosage}, Instructions: ${rx.instructions || 'None'}\n`;
      });
    }

    return prompt;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to UI immediately
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('Groq API Key is missing. Please configure VITE_GROQ_API_KEY in your .env file.');
      }

      const apiMessages = [
        { role: 'system', content: getSystemPrompt() },
        ...newMessages
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Failed to fetch response from Groq AI');
      }

      const data = await res.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (aiResponse) {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error connecting to AI Advisor');
      // Revert optimism if needed, but we'll just let the user re-type if they want.
    } finally {
      setIsTyping(false);
    }
  };

  if (loadingContext) {
    return (
      <div className="flex justify-center items-center p-16 h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-surface-400 text-sm font-medium">Initializing secure medical context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Bot className="w-8 h-8 text-brand-600" />
          AI Healthcare Advisor
        </h1>
        <p className="text-surface-500 text-sm mt-1">
          Ask questions about your condition, get diet recommendations, or clarify your prescriptions.
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden shadow-lg border border-surface-200 rounded-2xl relative">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 py-3 px-6 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
                <h3 className="font-bold text-base text-white">MedVault Agent</h3>
                <p className="text-brand-100 text-xs font-semibold uppercase tracking-wider">Llama-3 Powered</p>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-surface-50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 opacity-80">
              <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                 <Bot className="w-10 h-10 text-brand-600" />
              </div>
              <h3 className="text-xl font-bold text-surface-900">How can I assist you today?</h3>
              <p className="text-surface-500 text-sm mb-4">
                I have reviewed your medical history. Feel free to ask me about dietary adjustments, health tips, or details about your current prescriptions.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                 <button onClick={() => setInput('What should I eat based on my medical history?')} className="px-3 py-1.5 bg-white border border-surface-200 rounded-full text-xs font-medium text-surface-600 hover:bg-surface-50 hover:text-brand-600 transition-colors">Dietary Advice</button>
                 <button onClick={() => setInput('Can you explain my current prescriptions to me?')} className="px-3 py-1.5 bg-white border border-surface-200 rounded-full text-xs font-medium text-surface-600 hover:bg-surface-50 hover:text-brand-600 transition-colors">Explain Prescriptions</button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} stagger-item`} style={{ animationDelay: '50ms' }}>
              <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  msg.role === 'user' ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-brand-500 to-brand-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>

                <div className={`p-4 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-slate-800 text-white rounded-tr-sm' 
                    : 'bg-white border border-surface-200 text-surface-800 rounded-tl-sm'
                }`}>
                  <div className="text-sm md:text-base break-words whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>

              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] md:max-w-[75%] gap-3 flex-row">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-surface-200 rounded-tl-sm shadow-sm flex gap-1.5 items-center h-12 md:h-[52px]">
                  <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-surface-200 rounded-b-2xl">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message your healthcare advisor..."
              className="flex-1 text-sm py-3 px-4 rounded-xl border border-surface-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-4 py-3 md:px-6 md:py-3 font-semibold transition-all shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
            >
              <span className="hidden md:inline">Ask Advisor</span>
              <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </form>
          <div className="text-center mt-2.5">
            <span className="text-[10px] text-surface-400 font-medium tracking-wide">
              AI answers may not be 100% accurate. Please consult your physician for medical decisions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
