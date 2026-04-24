import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileText, Pill, Calendar, User, Stethoscope, Heart, Edit2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyRecords() {
  const { user, profile } = useAuth();
  const [patientData, setPatientData] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    dob: '',
    phone: '',
    email: '',
    address: '',
    blood_group: ''
  });

  const [medicalDetails, setMedicalDetails] = useState({
    allergies: '',
    chronic_conditions: '',
    past_surgeries: '',
    current_medications: '',
    family_history: '',
    lifestyle: '',
    general_notes: ''
  });

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const fetchMyRecords = async () => {
    setLoading(true);
    try {
      // Get the patient record for the current user
      const { data: patient } = await supabase
        .from('patient')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (patient) {
        setPatientData(patient);
        setFormData({
          name: patient.name || '',
          gender: patient.gender || '',
          dob: patient.dob || '',
          phone: patient.phone || '',
          email: patient.email || '',
          address: patient.address || '',
          blood_group: patient.blood_group || '',
        });

        // Parse legacy or formatted med_history
        const rawHistory = patient.med_history || '';
        const extractField = (label: string) => {
           const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.*?)(?=\\n\\*\\*|$)`, 's');
           const match = rawHistory.match(regex);
           return match ? match[1].trim() : '';
        };

        if (rawHistory.includes('**Allergies:**')) {
          setMedicalDetails({
            allergies: extractField('Allergies').replace('None', ''),
            chronic_conditions: extractField('Chronic Conditions').replace('None', ''),
            past_surgeries: extractField('Past Surgeries').replace('None', ''),
            current_medications: extractField('Current Medications').replace('None', ''),
            family_history: extractField('Family History').replace('Not specified', ''),
            lifestyle: extractField('Lifestyle Factors').replace('Not specified', ''),
            general_notes: extractField('General Notes').replace('None', '')
          });
        } else {
          setMedicalDetails(prev => ({ ...prev, general_notes: rawHistory }));
        }

        // Get prescriptions via appointments for this patient
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
      } else {
        // If no patient record exists yet, prepopulate the form with auth data
        setFormData(prev => ({
          ...prev,
          name: profile?.full_name || '',
          email: user?.email || ''
        }));
      }
    } catch (e: any) {
      if (e.code !== 'PGRST116') { // PGRST116 is "no rows returned", which is fine for brand new users
        console.error(e);
        toast.error('Failed to load records');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      
      const formattedMedHistory = `
**Allergies:** ${medicalDetails.allergies || 'None'}
**Chronic Conditions:** ${medicalDetails.chronic_conditions || 'None'}
**Past Surgeries:** ${medicalDetails.past_surgeries || 'None'}
**Current Medications:** ${medicalDetails.current_medications || 'None'}
**Family History:** ${medicalDetails.family_history || 'Not specified'}
**Lifestyle Factors:** ${medicalDetails.lifestyle || 'Not specified'}
**General Notes:** ${medicalDetails.general_notes || 'None'}
      `.trim();

      const payload = {
        ...formData,
        med_history: formattedMedHistory,
        user_id: user?.id,
      };

      if (patientData?.patient_id) {
        // Update existing
        const { error } = await supabase
          .from('patient')
          .update(payload)
          .eq('patient_id', patientData.patient_id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('patient')
          .insert([payload]);
        if (error) throw error;
      }

      toast.success("Profile saved successfully!");
      setIsEditing(false);
      fetchMyRecords();
    } catch (e: any) {
      toast.error(e.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-400 text-sm">Loading your records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{patientData ? 'My Medical Records' : 'Setup Your Profile'}</h1>
          <p className="text-surface-400 text-sm mt-1">
            {patientData ? 'Your personal health information' : 'Please complete your medical profile to continue'}
          </p>
        </div>
        {!isEditing && patientData && (
          <button onClick={() => setIsEditing(true)} className="btn-secondary flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>

      {/* Patient Profile Form Modal overlay (or inline depending on preference) - Let's do inline for simplicity / user focus */}
      {isEditing || !patientData ? (
        <div className="glass-card p-6 md:p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-surface-900">
               <User className="text-brand-600 w-6 h-6" />
               {patientData ? 'Update Profile' : 'Complete Medical Profile'}
            </h2>
            {patientData && (
              <button onClick={() => setIsEditing(false)} className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label-text">Full Name</label>
                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
              </div>
              <div>
                <label className="label-text">Email Address</label>
                <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
              </div>
              <div>
                <label className="label-text">Phone Number</label>
                <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="label-text">Date of Birth</label>
                <input type="date" className="input-field" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Gender</label>
                <select className="select-field" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                  <option value="">Select Gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="label-text">Blood Group</label>
                <select className="select-field" value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})}>
                  <option value="">Select Blood Group...</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="label-text">Full Home Address</label>
              <input type="text" className="input-field" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="123 Health St, City, Country" />
            </div>

            <div className="pt-4 border-t border-surface-100">
               <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
                 <Stethoscope className="w-5 h-5 text-brand-600" />
                 Comprehensive Medical History
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                   <label className="label-text text-amber-700 font-semibold">Known Allergies</label>
                   <textarea rows={2} className="input-field border-amber-200 focus:border-amber-500 focus:ring-amber-500/10" value={medicalDetails.allergies} onChange={e => setMedicalDetails({...medicalDetails, allergies: e.target.value})} placeholder="Penicillin, Peanuts, Latex..."></textarea>
                 </div>
                 
                 <div>
                   <label className="label-text">Existing Chronic Conditions</label>
                   <textarea rows={2} className="input-field" value={medicalDetails.chronic_conditions} onChange={e => setMedicalDetails({...medicalDetails, chronic_conditions: e.target.value})} placeholder="Asthma, Type 2 Diabetes, Hypertension..."></textarea>
                 </div>

                 <div>
                   <label className="label-text">Past Surgeries & Operations</label>
                   <textarea rows={2} className="input-field" value={medicalDetails.past_surgeries} onChange={e => setMedicalDetails({...medicalDetails, past_surgeries: e.target.value})} placeholder="Appendectomy (2018), ACL Repair (2020)..."></textarea>
                 </div>

                 <div>
                   <label className="label-text">Current Non-Prescription Medications</label>
                   <textarea rows={2} className="input-field" value={medicalDetails.current_medications} onChange={e => setMedicalDetails({...medicalDetails, current_medications: e.target.value})} placeholder="Daily multivitamins, Ibuprofen PRN..."></textarea>
                 </div>

                 <div>
                   <label className="label-text">Family Medical History</label>
                   <textarea rows={2} className="input-field" value={medicalDetails.family_history} onChange={e => setMedicalDetails({...medicalDetails, family_history: e.target.value})} placeholder="Father: Heart Disease, Mother: Breast Cancer..."></textarea>
                 </div>

                 <div>
                   <label className="label-text">Lifestyle Factors</label>
                   <textarea rows={2} className="input-field" value={medicalDetails.lifestyle} onChange={e => setMedicalDetails({...medicalDetails, lifestyle: e.target.value})} placeholder="Smoker (1 pack/day), Alcohol (Occasional), Vegan Diet..."></textarea>
                 </div>
               </div>

               <div className="mt-5">
                 <label className="label-text">General Notes / Other Details</label>
                 <textarea rows={3} className="input-field" value={medicalDetails.general_notes} onChange={e => setMedicalDetails({...medicalDetails, general_notes: e.target.value})} placeholder="Any additional medical history not covered above..."></textarea>
               </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-surface-100">
              {patientData && (
                 <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
              )}
              <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2">
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Patient Info Card (View Mode) */
        <div className="glass-card overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-brand-500 to-brand-400" />
          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shadow-glow">
                {patientData.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-surface-900">{patientData.name}</h2>
                <p className="text-surface-400 text-sm">{patientData.email || 'No email set'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Gender', value: patientData.gender || 'N/A', icon: User },
                { label: 'Blood Group', value: patientData.blood_group || 'N/A', icon: Heart },
                { label: 'Phone', value: patientData.phone || 'N/A', icon: User },
                { label: 'DOB', value: patientData.dob ? new Date(patientData.dob).toLocaleDateString() : 'N/A', icon: Calendar },
              ].map((item, i) => (
                 <div key={i} className="p-3 rounded-xl bg-surface-50">
                    <p className="text-xs font-medium text-surface-400 mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-surface-800">{item.value}</p>
                 </div>
              ))}
            </div>

            {patientData.med_history && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-1">Medical History</p>
                <p className="text-sm text-amber-800">{patientData.med_history}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prescriptions */}
      {patientData && !isEditing && (
        <div className="glass-card overflow-hidden mt-6">
          <div className="p-5 border-b border-surface-100">
            <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-500" />
              My Prescriptions
            </h2>
          </div>

          {prescriptions.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-10 h-10 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-400 text-sm">No prescriptions on record</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {prescriptions.map((rx, idx) => (
                <div 
                  key={rx.rx_id} 
                  className="p-5 hover:bg-surface-50/50 transition-colors stagger-item"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-surface-900">{rx.medication}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="badge-amber">{rx.dosage}</span>
                          {rx.duration && <span className="badge-blue">{rx.duration}</span>}
                        </div>
                        {rx.instructions && (
                          <p className="text-xs text-surface-400 mt-2">{rx.instructions}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-xs text-surface-400 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        Dr. {rx.appointment?.doctor?.name || 'N/A'}
                      </div>
                      <div className="text-xs text-surface-300 mt-1">
                        {rx.prescribed_at 
                          ? new Date(rx.prescribed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
