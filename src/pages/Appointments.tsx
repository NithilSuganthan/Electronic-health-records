import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Trash2, X, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appDate, setAppDate] = useState('');
  const [appTime, setAppTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchFormOptions();
  }, [search, filterDate, filterStatus]);

  const fetchFormOptions = async () => {
    const [pts, docs] = await Promise.all([
      supabase.from('patient').select('patient_id, name').order('name'),
      supabase.from('doctor').select('doctor_id, name, dept_id').order('name')
    ]);
    if (pts.data) {
      setPatients(pts.data);
      if (pts.data.length > 0 && !patientId) setPatientId(pts.data[0].patient_id);
    }
    if (docs.data) {
      setDoctors(docs.data);
      if (docs.data.length > 0 && !doctorId) setDoctorId(docs.data[0].doctor_id);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    let query = supabase.from('appointment')
      .select('*, patient(name), doctor(name), department(dept_name)')
      .order('time', { ascending: false });

    const { data, error } = await query;
    if (error) {
      toast.error('Error fetching appointments');
    } else {
      let filtered = data || [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((a: any) =>
          a.patient?.name?.toLowerCase().includes(s) ||
          a.doctor?.name?.toLowerCase().includes(s)
        );
      }
      if (filterDate) {
        filtered = filtered.filter((a: any) =>
          new Date(a.time).toISOString().split('T')[0] === filterDate
        );
      }
      if (filterStatus) {
        filtered = filtered.filter((a: any) => a.status === filterStatus);
      }
      setAppointments(filtered);
    }
    setLoading(false);
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedDoc = doctors.find(d => d.doctor_id === doctorId);
      if (!selectedDoc) throw new Error("Doctor not found");
      const dateTime = new Date(`${appDate}T${appTime}`).toISOString();

      const { error } = await supabase.from('appointment').insert([{
        time: dateTime,
        patient_id: patientId,
        doctor_id: doctorId,
        dept_id: selectedDoc.dept_id,
        notes: notes || null,
        status: 'scheduled'
      }]);
      if (error) throw error;
      toast.success('Appointment booked!');
      setIsModalOpen(false);
      setAppDate(''); setAppTime(''); setNotes('');
      fetchAppointments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('appointment').update({ status }).eq('appointment_id', id);
      if (error) throw error;
      toast.success(`Appointment ${status}`);
      fetchAppointments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this appointment?')) return;
    try {
      const { error } = await supabase.from('appointment').delete().eq('appointment_id', id);
      if (error) throw error;
      toast.success('Appointment deleted');
      fetchAppointments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-green';
      case 'cancelled': return 'badge-red';
      default: return 'badge-blue';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="text-surface-400 text-sm mt-1">{appointments.length} appointments</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input type="text" placeholder="Search by patient or doctor..." className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <input type="date" className="input-field w-auto" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <select className="select-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-100">
            <thead>
              <tr className="bg-surface-50/50">
                <th className="table-header">Date & Time</th>
                <th className="table-header">Patient</th>
                <th className="table-header">Doctor</th>
                <th className="table-header">Department</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-surface-400 text-sm">Loading...</p>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <Calendar className="w-10 h-10 text-surface-200 mx-auto mb-3" />
                    <p className="text-surface-400 text-sm">No appointments found</p>
                  </td>
                </tr>
              ) : (
                appointments.map((a, idx) => (
                  <tr key={a.appointment_id} className="hover:bg-surface-50/50 transition-colors stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="table-cell">
                      <div className="font-semibold text-surface-900">
                        {new Date(a.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-surface-400">
                        {new Date(a.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="table-cell text-surface-600">{a.patient?.name || 'N/A'}</td>
                    <td className="table-cell text-surface-600">Dr. {a.doctor?.name || 'N/A'}</td>
                    <td className="table-cell">
                      <span className="badge-purple">{a.department?.dept_name || 'N/A'}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`${getStatusBadge(a.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(a.status)}
                        {a.status || 'scheduled'}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === 'scheduled' && (
                          <>
                            <button onClick={() => updateStatus(a.appointment_id, 'completed')} className="btn-success" title="Mark Complete">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => updateStatus(a.appointment_id, 'cancelled')} className="btn-danger" title="Cancel">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(a.appointment_id)} className="btn-danger" title="Delete">
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
              <h2 className="text-xl font-bold text-surface-900">Book Appointment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label className="label-text">Patient</label>
                <select required className="select-field" value={patientId} onChange={e => setPatientId(e.target.value)}>
                  {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Doctor</label>
                <select required className="select-field" value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                  {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Date</label>
                  <input required type="date" className="input-field" value={appDate} onChange={e => setAppDate(e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Time</label>
                  <input required type="time" className="input-field" value={appTime} onChange={e => setAppTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-text">Notes (optional)</label>
                <textarea className="input-field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for visit..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={!patientId || !doctorId} className="btn-primary flex-1">
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
