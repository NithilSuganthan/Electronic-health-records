import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, Search, Trash2, Edit3, X, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';

interface Department {
  deptId: string;
  deptName: string;
  location: string;
}

interface Doctor {
  doctorId: string;
  name: string;
  phone: string;
  speciality: string;
  deptId: string;
  departmentName: string;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [deptId, setDeptId] = useState('');

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
  }, [search]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch(api('/api/departments'));
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(data);
      if (data.length > 0 && !deptId) setDeptId(data[0].deptId);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await fetch(api('/api/doctors'));
      if (!response.ok) throw new Error('Failed to fetch doctors');
      const data = await response.json();
      
      let filteredData = data;
      if (search) {
        filteredData = data.filter((d: Doctor) => 
          d.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      setDoctors(filteredData);
    } catch (error) {
      toast.error('Error fetching doctors');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName(''); setPhone(''); setSpeciality('');
    setDeptId(departments[0]?.deptId || '');
    setEditingDoctor(null);
  };

  const openEditModal = (d: Doctor) => {
    setEditingDoctor(d);
    setName(d.name); setPhone(d.phone || '');
    setSpeciality(d.speciality || ''); setDeptId(d.deptId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const doctorData = { name, phone, speciality, deptId };

      const url = editingDoctor 
        ? api(`/api/doctors/${editingDoctor.doctorId}`)
        : api('/api/doctors');
      
      const method = editingDoctor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorData),
      });

      if (!response.ok) throw new Error('Action failed');

      toast.success(editingDoctor ? 'Doctor updated successfully' : 'Doctor added successfully');
      setIsModalOpen(false);
      resetForm();
      fetchDoctors();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;
    try {
      const response = await fetch(api(`/api/doctors/${id}`), {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete failed');
      toast.success('Doctor deleted');
      fetchDoctors();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const specialityColors: Record<string, string> = {
    'Cardiology': 'badge-red',
    'Neurology': 'badge-purple',
    'Pediatrics': 'badge-green',
    'Orthopedics': 'badge-blue',
    'Dermatology': 'badge-amber',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="text-surface-400 text-sm mt-1">{doctors.length} doctors on staff</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Doctor
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search doctors by name..."
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
                <th className="table-header">Doctor</th>
                <th className="table-header">Speciality</th>
                <th className="table-header">Department</th>
                <th className="table-header">Phone</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-surface-400 text-sm">Loading doctors...</p>
                  </td>
                </tr>
              ) : doctors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <Stethoscope className="w-10 h-10 text-surface-200 mx-auto mb-3" />
                    <p className="text-surface-400 text-sm">No doctors found</p>
                  </td>
                </tr>
              ) : (
                doctors.map((d, idx) => (
                  <tr 
                    key={d.doctorId} 
                    className="hover:bg-surface-50/50 transition-colors stagger-item"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                          {d.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900">Dr. {d.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={specialityColors[d.speciality] || 'badge-blue'}>
                        {d.speciality || 'General'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="badge-purple">{d.departmentName || 'Unassigned'}</span>
                    </td>
                    <td className="table-cell text-surface-600">{d.phone || 'N/A'}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(d)} className="btn-success">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(d.doctorId)} className="btn-danger">
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
                {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Full Name</label>
                <input required type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Phone</label>
                  <input required type="tel" className="input-field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="label-text">Speciality</label>
                  <input required type="text" className="input-field" value={speciality} onChange={e => setSpeciality(e.target.value)} placeholder="Cardiology" />
                </div>
              </div>
              <div>
                <label className="label-text">Department</label>
                <select required className="select-field" value={deptId} onChange={e => setDeptId(e.target.value)}>
                  {departments.map((dept) => (
                    <option key={dept.deptId} value={dept.deptId}>{dept.deptName}</option>
                  ))}
                  {departments.length === 0 && <option value="" disabled>No departments available</option>}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={!deptId} className="btn-primary flex-1">
                  {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
