import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users, UserPlus, FileText, Calendar, Building, Activity, LogOut,
  LayoutDashboard, Heart, Stethoscope, Shield, ChevronRight, Bot
} from 'lucide-react';

const Layout = () => {
  const { user, profile, signOut, loading, profileLoading, role } = useAuth();
  const location = useLocation();

  // ─── Loading State ───
  // Show spinner while initial auth session is being resolved
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500 font-medium">Loading MedVault...</p>
        </div>
      </div>
    );
  }

  // ─── Not Authenticated ───
  // Redirect to login, but remember where they wanted to go (like GitHub does)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ─── Profile Still Loading ───
  // CRITICAL: Don't sign them out! The profile is just still being fetched.
  // Real apps (Gmail, Notion, etc.) show a loading state here instead.
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ─── No Profile Found After Loading ───
  // The user is authenticated but has no profile record.
  // Instead of silently signing out (which causes an infinite loop),
  // show an error state with a clear action.
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-2">Profile Not Found</h2>
          <p className="text-surface-500 text-sm mb-6">
            Your account exists but no profile was found. This can happen with older accounts. 
            Please sign out and register again, or contact support.
          </p>
          <button
            onClick={signOut}
            className="btn-primary w-full py-3 text-base"
          >
            Sign Out & Re-register
          </button>
        </div>
      </div>
    );
  }

  // ─── Authenticated with profile — render the app ───

  // Define nav items based on role
  const getNavItems = () => {
    const common = [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    ];

    switch (role) {
      case 'admin':
        return [
          ...common,
          { to: "/appointments", icon: Calendar, label: "Appointments" },
          { to: "/patients", icon: Users, label: "Patients" },
          { to: "/doctors", icon: UserPlus, label: "Doctors" },
          { to: "/departments", icon: Building, label: "Departments" },
          { to: "/prescriptions", icon: FileText, label: "Prescriptions" },
        ];
      case 'doctor':
        return [
          ...common,
          { to: "/my-appointments", icon: Calendar, label: "My Appointments" },
          { to: "/my-patients", icon: Users, label: "My Patients" },
          { to: "/prescriptions", icon: FileText, label: "Prescriptions" },
        ];
      case 'patient':
        return [
          ...common,
          { to: "/my-appointments", icon: Calendar, label: "My Appointments" },
          { to: "/my-records", icon: FileText, label: "My Records" },
          { to: "/book-appointment", icon: Calendar, label: "Book Appointment" },
          { to: "/ai-advisor", icon: Bot, label: "AI Advisor" },
        ];
      default:
        return common;
    }
  };

  const navItems = getNavItems();

  const roleConfig = {
    admin: { icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50', label: 'Administrator' },
    doctor: { icon: Stethoscope, color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Doctor' },
    patient: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Patient' },
  };

  const currentRole = role ? roleConfig[role] : roleConfig.patient;

  return (
    <div className="flex h-screen bg-surface-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-surface-200 hidden md:flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-glow">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900">MedVault</h1>
              <p className="text-xs text-surface-400 font-medium">EHR System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-3 mb-3">Navigation</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
              <ChevronRight className={`w-4 h-4 ml-auto opacity-0 transition-opacity ${
                location.pathname === item.to ? 'opacity-100' : 'group-hover:opacity-50'
              }`} />
            </NavLink>
          ))}
        </nav>

        {/* User Info Card */}
        <div className="p-4 border-t border-surface-100">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentRole.bg} mb-3`}>
            <currentRole.icon className={`w-4 h-4 ${currentRole.color}`} />
            <span className={`text-xs font-semibold ${currentRole.color}`}>{currentRole.label}</span>
          </div>
          
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {(profile?.full_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-900 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-surface-400 truncate">{user.email}</p>
            </div>
          </div>
          
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg font-medium transition-all duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-surface-200 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-600 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-surface-900">MedVault</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${currentRole.bg}`}>
            <currentRole.icon className={`w-3.5 h-3.5 ${currentRole.color}`} />
            <span className={`text-xs font-semibold ${currentRole.color}`}>{currentRole.label}</span>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-40 px-2 py-1.5 flex justify-around">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                isActive ? 'text-brand-600' : 'text-surface-400'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14 pb-20 md:pb-0">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
