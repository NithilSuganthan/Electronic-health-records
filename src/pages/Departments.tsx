import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Trash2, Edit3, X, Building, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface Department {
  dept_id: string;
  dept_name: string;
  location: string;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);

  const [deptName, setDeptName] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, [search]);

  const fetchDepartments = async () => {
    setLoading(true);
    let query = supabase.from('department').select('*').order('dept_name');
    if (search) {
      query = query.ilike('dept_name', `%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      toast.error('Error fetching departments');
    } else {
      setDepartments(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setDeptName(''); setLocation(''); setEditingDept(null);
  };

  const openEditModal = (d: Department) => {
    setEditingDept(d);
    setDeptName(d.dept_name); setLocation(d.location || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const deptData = { dept_name: deptName, location };

      if (editingDept) {
        const { error } = await supabase.from('department').update(deptData).eq('dept_id', editingDept.dept_id);
        if (error) throw error;
        toast.success('Department updated');
      } else {
        const { error } = await supabase.from('department').insert([deptData]);
        if (error) throw error;
        toast.success('Department added');
      }

      setIsModalOpen(false);
      resetForm();
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will remove the department.')) return;
    try {
      const { error } = await supabase.from('department').delete().eq('dept_id', id);
      if (error) throw error;
      toast.success('Department deleted');
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deptColors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-red-500',
    'from-indigo-500 to-violet-500',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="text-surface-400 text-sm mt-1">{departments.length} departments in the hospital</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search departments..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-400 text-sm">Loading departments...</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-16">
          <Building className="w-12 h-12 text-surface-200 mx-auto mb-3" />
          <p className="text-surface-400">No departments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d, idx) => (
            <div
              key={d.dept_id}
              className="glass-card-hover overflow-hidden stagger-item"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className={`h-2 bg-gradient-to-r ${deptColors[idx % deptColors.length]}`} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-surface-900">{d.dept_name}</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-surface-500 text-sm">
                      <MapPin className="w-3.5 h-3.5" />
                      {d.location || 'No location set'}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${deptColors[idx % deptColors.length]} shadow-sm`}>
                    <Building className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-100">
                  <button onClick={() => openEditModal(d)} className="btn-success text-xs flex-1">
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(d.dept_id)} className="btn-danger text-xs flex-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-surface-900">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Department Name</label>
                <input required type="text" className="input-field" value={deptName} onChange={e => setDeptName(e.target.value)} placeholder="e.g. Cardiology" />
              </div>
              <div>
                <label className="label-text">Location</label>
                <input required type="text" className="input-field" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Building A, Floor 2" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">
                  {editingDept ? 'Update' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
