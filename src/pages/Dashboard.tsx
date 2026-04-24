import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Users, UserPlus, Calendar, Building, Activity, TrendingUp,
  ArrowUpRight, Clock, FileText, Heart, Stethoscope, Bot, Command, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { role, profile } = useAuth();
  const [stats, setStats] = useState({
    patients: 0,
    doctors: 0,
    appointments: 0,
    departments: 0,
    prescriptions: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentFee, setAppointmentFee] = useState('500');
  const [updatingFee, setUpdatingFee] = useState(false);

  // Phase 3: AI Analytics
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  // Phase 3: Simulated Security Audit Logs
  const auditLogs = [
    { id: 1, action: 'Bulk Read (Patients)', user: 'admin', time: '10 mins ago', risk: 'Elevated' },
    { id: 2, action: 'Login from new IP', user: 'system', time: '1 hour ago', risk: 'High' },
    { id: 3, action: 'Prescription Deleted', user: 'Dr. Smith', time: '3 hours ago', risk: 'Routine' },
    { id: 4, action: 'Multiple Login Failures', user: 'unknown', time: '5 hours ago', risk: 'Critical' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        { count: patientCount },
        { count: doctorCount },
        { count: appointmentCount },
        { count: deptCount },
        { count: rxCount }
      ] = await Promise.all([
        supabase.from('patient').select('*', { count: 'exact', head: true }),
        supabase.from('doctor').select('*', { count: 'exact', head: true }),
        supabase.from('appointment').select('*', { count: 'exact', head: true }),
        supabase.from('department').select('*', { count: 'exact', head: true }),
        supabase.from('prescription').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        patients: patientCount || 0,
        doctors: doctorCount || 0,
        appointments: appointmentCount || 0,
        departments: deptCount || 0,
        prescriptions: rxCount || 0,
      });

      // Fetch recent appointments
      const { data: recent } = await supabase
        .from('appointment')
        .select('*, patient(name), doctor(name), department(dept_name)')
        .order('time', { ascending: false })
        .limit(5);
      
      setRecentAppointments(recent || []);

      // Fetch System Settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'appointment_fee')
        .single();
      
      if (settings) {
        setAppointmentFee(settings.value);
      }
    } catch (e: any) {
      toast.error('Failed to load dashboard');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsQuerying(true);
    setAiResponse('');
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API Key missing.");

      const prompt = `You are the MedVault Database AI Assistant. The admin is asking you a question about the hospital statistics.
Current Database Status:
- Total Patients: ${stats.patients}
- Total Doctors: ${stats.doctors}
- Total Appointments: ${stats.appointments}
- Departments: ${stats.departments}
- Prescriptions: ${stats.prescriptions}

User Query: "${aiQuery}"

Answer the query accurately using ONLY the provided state numbers. If they ask a complex question outside of these numbers, you can offer a simulated logical conclusion or advise that a custom SQL query is needed. Keep the response concise (2-4 sentences max).`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.2
        })
      });

      if (!res.ok) throw new Error("AI query failed.");
      const data = await res.json();
      setAiResponse(data.choices[0]?.message?.content || 'No response generated.');

    } catch (e: any) {
      toast.error(e.message || "Failed to execute AI query");
    } finally {
      setIsQuerying(false);
    }
  };

  const handleUpdateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingFee(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: appointmentFee, updated_at: new Date().toISOString() })
        .eq('key', 'appointment_fee');

      if (error) throw error;
      toast.success('Appointment fee updated successfully!');
    } catch (e: any) {
      toast.error('Failed to update fee');
    } finally {
      setUpdatingFee(false);
    }
  };

  const adminStats = [
    { name: 'Total Patients', value: stats.patients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
    { name: 'Total Doctors', value: stats.doctors, icon: Stethoscope, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+3%' },
    { name: 'Appointments', value: stats.appointments, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', trend: '+8%' },
    { name: 'Departments', value: stats.departments, icon: Building, color: 'text-amber-600', bg: 'bg-amber-50', trend: '0%' },
    { name: 'Prescriptions', value: stats.prescriptions, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50', trend: '+5%' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
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
          <p className="text-surface-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-surface-400 text-sm font-medium mb-1">{getGreeting()}</p>
          <h1 className="text-3xl font-bold text-surface-900 tracking-tight">
            {profile?.full_name || 'User'} 👋
          </h1>
          <p className="text-surface-500 mt-1">
            {role === 'admin' && 'Here\'s your hospital overview for today.'}
            {role === 'doctor' && 'Here\'s your schedule and patient overview.'}
            {role === 'patient' && 'Here\'s your health overview.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-surface-400">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
      {role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {adminStats.map((stat, idx) => (
            <div 
              key={idx} 
              className="glass-card-hover p-5 stagger-item"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  {stat.trend}
                </div>
              </div>
              <p className="text-2xl font-bold text-surface-900">{stat.value}</p>
              <p className="text-xs font-medium text-surface-400 mt-0.5">{stat.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Phase 3 Admin AI & Security Sections */}
      {role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AI Analytics Dashboard */}
          <div className="glass-card p-5 animate-fade-in flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-500" /> Natural Language Querying
                </h2>
                <p className="text-sm text-surface-400">Ask Groq AI about your hospital data</p>
              </div>
            </div>
            
            <form onSubmit={handleAiQuery} className="relative mb-4">
              <Command className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="e.g., 'What is the ratio of patients to doctors?'"
                className="input-field pl-10 pr-24"
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={isQuerying || !aiQuery.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {isQuerying ? 'Thinking...' : 'Ask AI'}
              </button>
            </form>

            <div className="flex-1 bg-surface-50 border border-surface-200 rounded-xl p-4 min-h-[120px]">
               {isQuerying ? (
                 <div className="flex items-center justify-center h-full gap-2 text-indigo-600 font-medium text-sm">
                   <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                   Processing SQL semantics...
                 </div>
               ) : aiResponse ? (
                 <div className="animate-fade-in">
                   <h4 className="text-xs font-bold text-indigo-700 mb-1 uppercase tracking-wider">AI Result</h4>
                   <p className="text-sm text-surface-700 leading-relaxed">{aiResponse}</p>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                   <Bot className="w-8 h-8 text-surface-300 mb-2" />
                   <p className="text-xs text-surface-500">I have access to live dashboard metrics. Ask away!</p>
                 </div>
               )}
            </div>
          </div>

          {/* Security Anomaly Logs */}
          <div className="glass-card p-5 animate-fade-in flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" /> Security Audit Logs
                </h2>
                <p className="text-sm text-surface-400">AI-detected anomalies in the last 24h</p>
              </div>
            </div>

            <div className="overflow-auto border border-surface-200 rounded-xl">
              <table className="min-w-full divide-y divide-surface-100">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="table-header py-2 text-xs">Event</th>
                    <th className="table-header py-2 text-xs">Actor</th>
                    <th className="table-header py-2 text-xs">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-50/50">
                      <td className="table-cell py-2">
                        <div className="font-medium text-surface-800">{log.action}</div>
                        <div className="text-[10px] text-surface-400">{log.time}</div>
                      </td>
                      <td className="table-cell py-2 text-xs text-surface-600">{log.user}</td>
                      <td className="table-cell py-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                          log.risk === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          log.risk === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          log.risk === 'Elevated' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {log.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* System Settings (Admin Only) */}
      {role === 'admin' && (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-900">System Configuration</h2>
              <p className="text-sm text-surface-400">Manage global application settings</p>
            </div>
          </div>

          <form onSubmit={handleUpdateFee} className="max-w-md space-y-4">
            <div>
              <label className="label-text">Global Appointment Fee (INR)</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 font-medium">₹</div>
                <input
                  type="number"
                  className="input-field pl-8"
                  value={appointmentFee}
                  onChange={e => setAppointmentFee(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <p className="text-[10px] text-surface-400 mt-1.5 px-1">
                This fee will be applied to all new appointment bookings across the platform.
              </p>
            </div>
            <button
              type="submit"
              disabled={updatingFee}
              className="btn-primary w-full sm:w-auto px-8"
            >
              {updatingFee ? 'Updating...' : 'Save Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Patient / Doctor stats */}
      {role !== 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card-hover p-5 stagger-item">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-900">{stats.appointments}</p>
            <p className="text-xs font-medium text-surface-400 mt-0.5">
              {role === 'doctor' ? 'Total Appointments' : 'My Appointments'}
            </p>
          </div>
          <div className="glass-card-hover p-5 stagger-item" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-900">{stats.prescriptions}</p>
            <p className="text-xs font-medium text-surface-400 mt-0.5">Prescriptions</p>
          </div>
          <div className="glass-card-hover p-5 stagger-item" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-900">{stats.doctors}</p>
            <p className="text-xs font-medium text-surface-400 mt-0.5">Available Doctors</p>
          </div>
        </div>
      )}

      {/* Recent Appointments */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-900">Recent Appointments</h2>
            <p className="text-sm text-surface-400">Latest appointment activity</p>
          </div>
          <Calendar className="w-5 h-5 text-surface-300" />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {recentAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <Calendar className="w-10 h-10 text-surface-200 mx-auto mb-3" />
                    <p className="text-surface-400 text-sm">No appointments yet</p>
                  </td>
                </tr>
              ) : (
                recentAppointments.map((a, idx) => (
                  <tr key={a.appointment_id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="table-cell font-medium text-surface-900">
                      {new Date(a.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="block text-xs text-surface-400">
                        {new Date(a.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="table-cell text-surface-600">{a.patient?.name || 'N/A'}</td>
                    <td className="table-cell text-surface-600">Dr. {a.doctor?.name || 'N/A'}</td>
                    <td className="table-cell">
                      <span className="badge-purple">{a.department?.dept_name || 'N/A'}</span>
                    </td>
                    <td className="table-cell">
                      <span className={getStatusBadge(a.status)}>{a.status || 'scheduled'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Info Card */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl shadow-glow flex-shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-surface-900 mb-1">
              {role === 'admin' && 'Welcome to MedVault Admin'}
              {role === 'doctor' && 'Welcome to MedVault Doctor Portal'}
              {role === 'patient' && 'Welcome to MedVault Patient Portal'}
            </h3>
            <p className="text-surface-500 text-sm leading-relaxed">
              {role === 'admin' && 'Manage all aspects of the healthcare system — patients, doctors, departments, appointments, and prescriptions. Use the sidebar to navigate between sections.'}
              {role === 'doctor' && 'View and manage your scheduled appointments, access patient records, and write prescriptions. Your schedule is personalized based on your assignments.'}
              {role === 'patient' && 'Book appointments with available doctors, view your medical records, and track your prescriptions. Your health data is secure and private.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
