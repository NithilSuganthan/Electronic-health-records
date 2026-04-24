import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Mail, Lock, User, Stethoscope, Heart, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserRole } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading, profileLoading } = useAuth();

  // ─── Real-website pattern: Redirect away from login if already authenticated ───
  // This is what Google, GitHub, and every production app does.
  // If a user is already signed in, they should never see the login page.
  useEffect(() => {
    if (authLoading || profileLoading) return; // Wait for auth to settle
    if (user && profile) {
      // If they came from somewhere, send them back; otherwise go to dashboard
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, profile, authLoading, profileLoading, navigate, location]);

  // Only Patient & Doctor roles are visible on the public login
  const roles = [
    {
      value: 'patient' as UserRole,
      label: 'Patient',
      icon: Heart,
      description: 'Book appointments & view records',
      bg: 'bg-rose-50',
    },
    {
      value: 'doctor' as UserRole,
      label: 'Doctor',
      icon: Stethoscope,
      description: 'Manage patients & prescriptions',
      bg: 'bg-cyan-50',
    },
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('user_profiles').insert([{
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: selectedRole,
          }]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          if (selectedRole === 'patient') {
            await supabase.from('patient').insert([{
              name: fullName,
              email: email,
              user_id: authData.user.id
            }]);
          }

          if (selectedRole === 'doctor') {
            await supabase.from('doctor').insert([{
              name: fullName,
              user_id: authData.user.id
            }]);
          }
        }

        toast.success("Account created successfully! Welcome to MedVault.");
        // Navigation will happen automatically via the useEffect above
        // once AuthContext picks up the new session and loads the profile.
        // No need for manual navigate() — this is the production pattern.
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Check if user has a profile (legacy accounts might not)
        if (data.user) {
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!existingProfile) {
            // Auto-create a patient profile for legacy accounts
            await supabase.from('user_profiles').insert([{
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.email?.split('@')[0] || 'User',
              role: 'patient',
            }]);
            // Also create patient record
            await supabase.from('patient').insert([{
              name: data.user.email?.split('@')[0] || 'User',
              email: data.user.email,
              user_id: data.user.id,
            }]);
          }
        }

        toast.success("Welcome back!");
        // Navigation will happen automatically via the useEffect above.
        // The AuthContext's onAuthStateChange listener will fire,
        // load the profile, and the useEffect redirect will kick in.
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  // Show a spinner if auth is still resolving (e.g., checking stored session on page load)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and profile is loading, show a transition screen
  if (user && profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500 font-medium">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 auth-gradient relative overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Activity className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">MedVault</h1>
              <p className="text-white/70 text-sm font-medium">EHR Management System</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Modern Healthcare,<br />
            <span className="text-white/80">Simplified.</span>
          </h2>
          
          <p className="text-white/60 text-lg leading-relaxed max-w-md">
            Streamline patient care with our intelligent Electronic Health Record system. 
            Manage appointments, prescriptions, and medical records — all in one place.
          </p>

          <div className="mt-12 space-y-4">
            {[
              'Separate portals for Doctors & Patients',
              'Real-time appointment management',
              'Secure prescription tracking',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/80">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-2.5 bg-brand-600 rounded-xl">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-surface-900">MedVault</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-surface-900">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-surface-500 mt-1">
              {isSignUp ? 'Join MedVault to get started' : 'Sign in to your MedVault account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {/* Role Selection - only for signup */}
            {isSignUp && (
              <div className="space-y-2">
                <label className="label-text">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className={`
                        relative p-3 rounded-xl border-2 transition-all duration-200 text-center group
                        ${selectedRole === role.value 
                          ? `border-brand-500 ${role.bg} shadow-glow` 
                          : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50'
                        }
                      `}
                    >
                      <role.icon className={`w-5 h-5 mx-auto mb-1.5 ${selectedRole === role.value ? 'text-brand-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                      <span className={`text-xs font-semibold ${selectedRole === role.value ? 'text-brand-700' : 'text-surface-600'}`}>
                        {role.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full Name - only for signup */}
            {isSignUp && (
              <div>
                <label htmlFor="full-name" className="label-text">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <input
                    id="full-name"
                    type="text"
                    required
                    className="input-field pl-10"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email-address" className="label-text">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label-text">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Toggle */}
            <p className="text-center text-sm text-surface-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-brand-600 hover:text-brand-500 transition-colors"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
