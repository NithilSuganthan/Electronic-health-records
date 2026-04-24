import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Trash2, Edit3, X, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface Patient {
  patient_id: string;
  name: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  blood_group: string;
  med_history: string;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [medHistory, setMedHistory] = useState('');

  useEffect(() => {
    fetchPatients();
  }, [search]);

  const fetchPatients = async () => {
    setLoading(true);
    let query = supabase.from('patient').select('*').order('name');
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      toast.error('Error fetching patients');
    } else {
      setPatients(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName(''); setGender('Male'); setDob(''); setPhone('');
    setEmail(''); setAddress(''); setBloodGroup(''); setMedHistory('');
    setEditingPatient(null);
  };

  const openEditModal = (p: Patient) => {
    setEditingPatient(p);
    setName(p.name); setGender(p.gender || 'Male'); setDob(p.dob || '');
    setPhone(p.phone || ''); setEmail(p.email || ''); setAddress(p.address || '');
    setBloodGroup(p.blood_group || ''); setMedHistory(p.med_history || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const patientData = {
        name, gender, dob: dob || null, phone, email, address,
        blood_group: bloodGroup, med_history: medHistory
      };

      if (editingPatient) {
        const { error } = await supabase
          .from('patient')
          .update(patientData)
          .eq('patient_id', editingPatient.patient_id);
        if (error) throw error;
        toast.success('Patient updated successfully');
      } else {
        const { error } = await supabase.from('patient').insert([patientData]);
        if (error) throw error;
        toast.success('Patient added successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchPatients();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    try {
      const { error } = await supabase.from('patient').delete().eq('patient_id', id);
      if (error) throw error;
      toast.success('Patient deleted');
      fetchPatients();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="text-surface-400 text-sm mt-1">{patients.length} total patients registered</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Patient
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search patients by name..."
              className="input-field pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-100">
            <thead>
              <tr className="bg-surface-50/50">
                <th className="table-header">Patient</th>
                <th className="table-header">Gender</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Blood Group</th>
                <th className="table-header">Medical History</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-surface-400 text-sm">Loading patients...</p>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <UsersIcon className="w-10 h-10 text-surface-200 mx-auto mb-3" />
                    <p className="text-surface-400 text-sm">No patients found</p>
                  </td>
                </tr>
              ) : (
                patients.map((p, idx) => (
                  <tr 
                    key={p.patient_id} 
                    className="hover:bg-surface-50/50 transition-colors stagger-item"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900">{p.name}</p>
                          <p className="text-xs text-surface-400">{p.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${p.gender === 'Male' ? 'badge-blue' : p.gender === 'Female' ? 'badge-purple' : 'badge-amber'}`}>
                        {p.gender || 'N/A'}
                      </span>
                    </td>
                    <td className="table-cell text-surface-600">{p.phone || 'N/A'}</td>
                    <td className="table-cell">
                      {p.blood_group ? (
                        <span className="badge-red">{p.blood_group}</span>
                      ) : (
                        <span className="text-surface-300 text-xs">Not set</span>
                      )}
                    </td>
                    <td className="table-cell text-surface-500 max-w-[200px] truncate text-sm">
                      {p.med_history || '—'}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(p)} className="btn-success">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.patient_id)} className="btn-danger">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-surface-900">
                {editingPatient ? 'Edit Patient' : 'Add New Patient'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-text">Full Name</label>
                  <input required type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className="label-text">Gender</label>
                  <select className="select-field" value={gender} onChange={e => setGender(e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Date of Birth</label>
                  <input type="date" className="input-field" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Phone</label>
                  <input type="tel" className="input-field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="label-text">Email</label>
                  <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="patient@email.com" />
                </div>
                <div>
                  <label className="label-text">Blood Group</label>
                  <select className="select-field" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
                    <option value="">Select</option>
                    <option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option>
                    <option>O+</option><option>O-</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Address</label>
                  <input type="text" className="input-field" value={address} onChange={e => setAddress(e.target.value)} placeholder="City, State" />
                </div>
              </div>
              <div>
                <label className="label-text">Medical History</label>
                <textarea className="input-field" rows={3} value={medHistory} onChange={e => setMedHistory(e.target.value)} placeholder="Known allergies, chronic conditions..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">
                  {editingPatient ? 'Update Patient' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
