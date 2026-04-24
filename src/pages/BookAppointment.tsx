import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Calendar, Stethoscope, Building, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BookAppointment() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appDate, setAppDate] = useState('');
  const [appTime, setAppTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [fee, setFee] = useState(500);

  useEffect(() => {
    fetchDepartments();
    fetchSettings();
    
    // Mount Razorpay
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchDoctors();
    }
  }, [selectedDept]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('department').select('*').order('dept_name');
    setDepartments(data || []);
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'appointment_fee')
        .single();
      
      if (data) {
        setFee(parseInt(data.value) || 500);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const fetchDoctors = async () => {
    let query = supabase.from('doctor').select('*, department(dept_name)').order('name');
    if (selectedDept) {
      query = query.eq('dept_id', selectedDept);
    }
    const { data } = await query;
    setDoctors(data || []);
  };

  const handleBook = async () => {
    if (!selectedDoctor || !appDate || !appTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Find patient record for current user
      const { data: patient } = await supabase
        .from('patient')
        .select('patient_id')
        .eq('user_id', user?.id)
        .single();

      if (!patient) {
        toast.error('Patient profile not found. Please contact admin.');
        setLoading(false);
        return;
      }

      // Initialize Razorpay
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY;
      if (!razorpayKey) {
        toast.error("VITE_RAZORPAY_KEY is missing in your environment configuration.");
        setLoading(false);
        return;
      }

      // Step 1: Create Order on Backend
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const orderResponse = await fetch(`${apiBaseUrl}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: fee * 100 }) // Convert to paise
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "MedVault Clinic",
        description: "Standard Consultation Fee",
        order_id: orderData.id,
        image: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/activity.svg",
        handler: async function (response: any) {
          try {
            // Step 2: Verify Payment on Backend
            const verifyRes = await fetch(`${apiBaseUrl}/api/payments/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.status === 'success') {
              toast.success("Payment verified! Booking appointment...");
              await finalizeBooking(patient.patient_id, response.razorpay_payment_id);
            } else {
              toast.error("Payment verification failed!");
              setLoading(false);
            }
          } catch (err) {
            console.error("Verification error:", err);
            toast.error("Error verifying payment");
            setLoading(false);
          }
        },
        prefill: {
          name: user?.email?.split('@')[0] || "Patient",
          email: user?.email || "",
        },
        theme: {
          color: "#7c3aed"
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            toast.error("Payment cancelled. Booking was not completed.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        setLoading(false);
        toast.error(response.error?.description || "Payment failed");
      });
      rzp.open();

    } catch (e: any) {
      toast.error(e.message);
      setLoading(false);
    }
  };

  const finalizeBooking = async (patientId: string, paymentId: string) => {
    try {
      // --- PHASE 4: AI Pre-Appointment Triage ---
      let triageLevel = '';
      if (notes.trim()) {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
          console.warn("Groq API Key missing, skipping AI triage.");
        } else {
          try {
            const prompt = `You are a medical triage AI. Analyze the patient's self-reported symptoms and classify the clinical urgency into EXACTLY ONE of the following four categories: 'Routine', 'Elevated', 'Urgent', or 'Critical'. Return ONLY the single word category name. No punctuation, no explanation.\n\nPatient Symptoms: ${notes}`;
            
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'system', content: prompt }],
                temperature: 0.1,
                max_tokens: 10
              })
            });

            if (res.ok) {
              const data = await res.json();
              const triageRaw = data.choices[0]?.message?.content?.trim();
              const match = ['Routine', 'Elevated', 'Urgent', 'Critical'].find(cl => triageRaw?.includes(cl));
              if (match) {
                 triageLevel = `[TRIAGE: ${match}]\n\n`;
              }
            }
          } catch (triageError) {
            console.error("AI Triage computation failed", triageError);
          }
        }
      }

      const doctor = doctors.find(d => d.doctor_id === selectedDoctor);
      const dateTime = new Date(`${appDate}T${appTime}`).toISOString();
      const rawNotes = notes || null;
      let finalNotes = triageLevel ? `${triageLevel}${rawNotes}` : rawNotes;
      
      // Append Payment Tag
      finalNotes = finalNotes ? `[PAID: ${paymentId}]\n\n${finalNotes}` : `[PAID: ${paymentId}]`;

      const { error } = await supabase.from('appointment').insert([{
        time: dateTime,
        patient_id: patientId,
        doctor_id: selectedDoctor,
        dept_id: doctor?.dept_id || selectedDept,
        notes: finalNotes,
        status: 'scheduled',
      }]);

      if (error) throw error;
      setSuccess(true);
      toast.success('Appointment booked successfully!');
    } catch (e: any) {
      toast.error(e.message || "Failed to finalize booking");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-surface-900 mb-2">Appointment Booked!</h2>
        <p className="text-surface-500 mb-8">
          Your appointment has been scheduled successfully. You'll find it in your "My Appointments" section.
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setStep(1);
            setSelectedDept('');
            setSelectedDoctor('');
            setAppDate('');
            setAppTime('');
            setNotes('');
          }}
          className="btn-primary"
        >
          Book Another Appointment
        </button>
      </div>
    );
  }

  const deptColors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-red-500',
    'from-indigo-500 to-violet-500',
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title">Book an Appointment</h1>
        <p className="text-surface-400 text-sm mt-1">Select a department, choose a doctor, then pick a time</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 px-4">
        {[
          { num: 1, label: 'Department' },
          { num: 2, label: 'Doctor' },
          { num: 3, label: 'Schedule' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= s.num 
                ? 'bg-brand-600 text-white shadow-glow' 
                : 'bg-surface-100 text-surface-400'
            }`}>
              {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${step >= s.num ? 'text-surface-900' : 'text-surface-400'}`}>
              {s.label}
            </span>
            {i < 2 && <div className={`flex-1 h-0.5 rounded ${step > s.num ? 'bg-brand-500' : 'bg-surface-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Department */}
      {step === 1 && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-surface-900">Select a Department</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {departments.map((dept, idx) => (
              <button
                key={dept.dept_id}
                onClick={() => {
                  setSelectedDept(dept.dept_id);
                  setStep(2);
                }}
                className={`glass-card-hover p-5 text-left transition-all ${
                  selectedDept === dept.dept_id ? 'ring-2 ring-brand-500 shadow-glow' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${deptColors[idx % deptColors.length]} flex items-center justify-center`}>
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-surface-900">{dept.dept_name}</p>
                    <p className="text-xs text-surface-400">{dept.location || 'Hospital'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Doctor */}
      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900">Choose a Doctor</h2>
            <button onClick={() => setStep(1)} className="text-sm text-brand-600 hover:text-brand-500 font-medium">
              ← Change Department
            </button>
          </div>
          {doctors.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Stethoscope className="w-10 h-10 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-400">No doctors in this department</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doctors.map((doc) => (
                <button
                  key={doc.doctor_id}
                  onClick={() => {
                    setSelectedDoctor(doc.doctor_id);
                    setStep(3);
                  }}
                  className={`glass-card-hover p-5 text-left transition-all ${
                    selectedDoctor === doc.doctor_id ? 'ring-2 ring-brand-500 shadow-glow' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                      {doc.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-surface-900">Dr. {doc.name}</p>
                      <p className="text-xs text-surface-400">{doc.speciality || 'General'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Schedule */}
      {step === 3 && (
        <div className="space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900">Pick a Date & Time</h2>
            <button onClick={() => setStep(2)} className="text-sm text-brand-600 hover:text-brand-500 font-medium">
              ← Change Doctor
            </button>
          </div>

          <div className="glass-card p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={appDate} 
                  onChange={e => setAppDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="label-text">Time</label>
                <input 
                  type="time" 
                  className="input-field" 
                  value={appTime} 
                  onChange={e => setAppTime(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="label-text">Symptoms / Reason for Visit (Required for AI Triage)</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Describe your symptoms in detail (e.g. chest pain, mild fever for 2 days) so our AI can appropriately prioritize your appointment..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={handleBook}
              disabled={loading || !appDate || !appTime}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {notes.trim() ? "Initializing Secure Checkout..." : "Initializing Checkout..."}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Pay ₹{fee} & Book
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
