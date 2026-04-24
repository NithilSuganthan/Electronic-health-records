import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Heart, Calendar, FileText, Search, Bot, Activity, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyPatients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Phase 2: AI Risk Profile
  const [aiModalPatient, setAiModalPatient] = useState<any>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<{ summary: string; riskLevel: string; recommendations: string } | null>(null);

  useEffect(() => {
    fetchMyPatients();
  }, [search]);

  const fetchMyPatients = async () => {
    setLoading(true);
    try {
      // Get the doctor record for the current user
      const { data: doctor } = await supabase
        .from('doctor')
        .select('doctor_id')
        .eq('user_id', user?.id)
        .single();

      if (!doctor) {
        setPatients([]);
        setLoading(false);
        return;
      }

      // Get unique patients from appointments
      const { data: appointments } = await supabase
        .from('appointment')
        .select('patient(patient_id, name, gender, phone, email, blood_group, med_history)')
        .eq('doctor_id', doctor.doctor_id);

      if (appointments) {
        // Deduplicate patients
        const patientMap = new Map();
        appointments.forEach((a: any) => {
          if (a.patient && !patientMap.has(a.patient.patient_id)) {
            patientMap.set(a.patient.patient_id, a.patient);
          }
        });
        let patientList = Array.from(patientMap.values());
        
        if (search) {
          const s = search.toLowerCase();
          patientList = patientList.filter(p => 
            p.name?.toLowerCase().includes(s)
          );
        }

        setPatients(patientList);
      }
    } catch (e: any) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiProfile = async (patient: any) => {
    setAiModalPatient(patient);
    setAiResult(null);
    setIsGeneratingAi(true);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API Key missing.");

      const prompt = `You are a clinical AI. Analyze this patient profile and generate a risk assessment.
Patient Name: ${patient.name}
Gender: ${patient.gender}
Blood Group: ${patient.blood_group}
Medical History: ${patient.med_history || 'None provided'}

Provide your assessment exactly in this JSON format without markdown code blocks:
{
  "summary": "2-3 sentences summarizing their clinical picture",
  "riskLevel": "Low | Moderate | High | Critical",
  "recommendations": "2-3 bullet points of suggested follow-up or lifestyle changes"
}`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.1
        })
      });

      if (!res.ok) throw new Error("AI Profile generation failed.");
      const data = await res.json();
      const content = data.choices[0]?.message?.content;
      
      // Clean up markdown block if it exists
      const cleanJson = content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      setAiResult({
        summary: parsed.summary || "Summary not generated.",
        riskLevel: parsed.riskLevel || "Unknown",
        recommendations: parsed.recommendations || "No recommendations."
      });

    } catch (e: any) {
      toast.error(e.message || "Failed to generate AI profile");
      setAiModalPatient(null);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-400 text-sm">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Patients</h1>
        <p className="text-surface-400 text-sm mt-1">{patients.length} patients under your care</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search patients..."
          className="input-field pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {patients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-14 h-14 text-surface-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-600 mb-2">No Patients Yet</h3>
          <p className="text-surface-400 text-sm">
            Patients will appear here once they book appointments with you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p, idx) => (
            <div
              key={p.patient_id}
              className="glass-card-hover p-5 stagger-item"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                  {p.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">{p.name}</h3>
                  <p className="text-xs text-surface-400">{p.email || 'No email'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-400">Gender</span>
                  <span className={`badge ${p.gender === 'Male' ? 'badge-blue' : p.gender === 'Female' ? 'badge-purple' : 'badge-amber'}`}>
                    {p.gender || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-400">Blood Group</span>
                  <span className="font-medium text-surface-700">{p.blood_group || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-400">Phone</span>
                  <span className="font-medium text-surface-700">{p.phone || 'N/A'}</span>
                </div>
              </div>

              {p.med_history && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50/80 border border-amber-100">
                  <p className="text-xs font-medium text-amber-700 mb-0.5">Medical History</p>
                  <p className="text-xs text-amber-600 line-clamp-2">{p.med_history}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-surface-100 flex justify-end">
                <button 
                  onClick={() => handleGenerateAiProfile(p)}
                  className="text-xs px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-sm hover:shadow transition-all w-full justify-center"
                >
                  <Bot className="w-3.5 h-3.5" /> Generate AI Risk Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Risk Profile Modal */}
      {aiModalPatient && (
        <div className="modal-overlay" onClick={() => !isGeneratingAi && setAiModalPatient(null)}>
          <div className="modal-content max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-surface-100 pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2 text-surface-900">
                <Bot className="text-purple-600 w-5 h-5" />
                AI Risk Assessment
              </h2>
              <button 
                onClick={() => setAiModalPatient(null)} 
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-50"
                disabled={isGeneratingAi}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                {aiModalPatient.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-surface-900">{aiModalPatient.name}</h3>
                <p className="text-xs text-surface-500">Patient ID: {aiModalPatient.patient_id?.substring(0,8) || 'N/A'}</p>
              </div>
            </div>

            {isGeneratingAi || !aiResult ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-purple-800">Analyzing medical history & demographics...</p>
                <p className="text-xs text-surface-400 mt-1">Groq LLM is building the risk profile</p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                    aiResult.riskLevel.includes('Low') ? 'bg-emerald-50 border-emerald-200' :
                    aiResult.riskLevel.includes('Moderate') ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <ShieldAlert className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    aiResult.riskLevel.includes('Low') ? 'text-emerald-500' :
                    aiResult.riskLevel.includes('Moderate') ? 'text-amber-500' : 'text-red-500'
                  }`} />
                  <div>
                    <h4 className={`text-sm font-bold mb-1 ${
                      aiResult.riskLevel.includes('Low') ? 'text-emerald-800' :
                      aiResult.riskLevel.includes('Moderate') ? 'text-amber-800' : 'text-red-800'
                    }`}>
                      {aiResult.riskLevel} Risk Patient
                    </h4>
                    <p className="text-sm text-surface-700">{aiResult.summary}</p>
                  </div>
                </div>

                <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                  <h4 className="text-sm font-bold text-surface-800 flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-brand-500" />
                    AI Clinical Recommendations
                  </h4>
                  <div className="text-sm text-surface-600 whitespace-pre-line leading-relaxed">
                    {aiResult.recommendations}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button onClick={() => setAiModalPatient(null)} className="btn-secondary">
                    Close Assessment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
