import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Trash2, X, FileText, Pill } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [duration, setDuration] = useState('');
  const [instructions, setInstructions] = useState('');
  const [appointmentId, setAppointmentId] = useState('');

  useEffect(() => {
    fetchPrescriptions();
    fetchAppointments();
  }, [search]);

  const fetchAppointments = async () => {
    const { data } = await supabase.from('appointment')
      .select('appointment_id, time, patient(name), doctor(name)')
      .order('time', { ascending: false });
    if (data) {
      setAppointments(data);
      if (data.length > 0 && !appointmentId) setAppointmentId(data[0].appointment_id);
    }
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('prescription')
      .select('*, appointment(time, patient(name), doctor(name))')
      .order('prescribed_at', { ascending: false });
    if (error) {
      toast.error('Error fetching prescriptions');
    } else {
      let filtered = data || [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((p: any) =>
          p.medication?.toLowerCase().includes(s) ||
          p.appointment?.patient?.name?.toLowerCase().includes(s)
        );
      }
      setPrescriptions(filtered);
    }
    setLoading(false);
  };

  const handleAddPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('prescription').insert([{
        medication, dosage, duration, instructions,
        appointment_id: appointmentId
      }]);
      if (error) throw error;
      toast.success('Prescription added!');
      setIsModalOpen(false);
      setMedication(''); setDosage(''); setDuration(''); setInstructions('');
      fetchPrescriptions();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prescription?')) return;
    try {
      const { error } = await supabase.from('prescription').delete().eq('rx_id', id);
      if (error) throw error;
      toast.success('Prescription deleted');
      fetchPrescriptions();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Prescriptions</h1>
          <p className="text-surface-400 text-sm mt-1">{prescriptions.length} prescriptions on record</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Prescription
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input type="text" placeholder="Search by medication or patient..." className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-100">
            <thead>
              <tr className="bg-surface-50/50">
                <th className="table-header">Medication</th>
                <th className="table-header">Dosage</th>
                <th className="table-header">Duration</th>
                <th className="table-header">Patient</th>
                <th className="table-header">Doctor</th>
                <th className="table-header">Date</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-surface-400 text-sm">Loading...</p>
                  </td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <Pill className="w-10 h-10 text-surface-200 mx-auto mb-3" />
                    <p className="text-surface-400 text-sm">No prescriptions found</p>
                  </td>
                </tr>
              ) : (
                prescriptions.map((p, idx) => (
                  <tr key={p.rx_id} className="hover:bg-surface-50/50 transition-colors stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Pill className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="font-semibold text-surface-900">{p.medication}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge-amber">{p.dosage}</span>
                    </td>
                    <td className="table-cell text-surface-600">{p.duration || '—'}</td>
                    <td className="table-cell text-surface-600">{p.appointment?.patient?.name || 'N/A'}</td>
                    <td className="table-cell text-surface-600">Dr. {p.appointment?.doctor?.name || 'N/A'}</td>
                    <td className="table-cell text-surface-400 text-xs">
                      {p.prescribed_at ? formatDate(p.prescribed_at) : p.appointment?.time ? formatDate(p.appointment.time) : 'N/A'}
                    </td>
                    <td className="table-cell text-right">
                      <button onClick={() => handleDelete(p.rx_id)} className="btn-danger">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
              <h2 className="text-xl font-bold text-surface-900">Add Prescription</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPrescription} className="space-y-4">
              <div>
                <label className="label-text">Appointment</label>
                <select required className="select-field text-sm" value={appointmentId} onChange={e => setAppointmentId(e.target.value)}>
                  {appointments.map(a => (
                    <option key={a.appointment_id} value={a.appointment_id}>
                      {a.patient?.name} w/ Dr. {a.doctor?.name} ({formatDate(a.time)})
                    </option>
                  ))}
                  {appointments.length === 0 && <option value="" disabled>No appointments</option>}
                </select>
              </div>
              <div>
                <label className="label-text">Medication</label>
                <input required type="text" className="input-field" value={medication} onChange={e => setMedication(e.target.value)} placeholder="e.g. Amoxicillin" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Dosage</label>
                  <input required type="text" className="input-field" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="500mg twice daily" />
                </div>
                <div>
                  <label className="label-text">Duration</label>
                  <input type="text" className="input-field" value={duration} onChange={e => setDuration(e.target.value)} placeholder="7 days" />
                </div>
              </div>
              <div>
                <label className="label-text">Instructions</label>
                <textarea className="input-field" rows={2} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Take after meals..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={!appointmentId} className="btn-primary flex-1">
                  Add Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
