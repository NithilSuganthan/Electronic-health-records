import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff, Terminal, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading, profileLoading, refreshProfile } = useAuth();

  // Redirect away if already authenticated as admin
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (user && profile) {
      if (profile.role === 'admin') {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }
  }, [user, profile, authLoading, profileLoading, navigate, location]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          // Create admin profile
          const { error: profileError } = await supabase.from('user_profiles').insert([{
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: 'admin',
          }]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
          } else {
            await refreshProfile();
          }
        }

        toast.success("Admin account created. Welcome aboard.");
        // Navigation happens automatically via useEffect when auth state updates
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data.user) {
          // Check if profile exists
          const { data: profileCheck } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (!profileCheck) {
            // No profile yet (legacy account) — create admin profile
            await supabase.from('user_profiles').insert([{
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.email?.split('@')[0] || 'Admin',
              role: 'admin',
            }]);
            await refreshProfile();
          } else if (profileCheck.role !== 'admin') {
            // User exists but is not an admin
            await supabase.auth.signOut();
            toast.error('Access denied. This portal is for administrators only.');
            setLoading(false);
            return;
          }
        }

        toast.success("Welcome back, Admin.");
        // Navigation happens automatically via useEffect when auth state updates
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Show a spinner if auth is still resolving
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-400 font-medium tracking-wide">Validating security clearance...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and profile is loading, show a transition screen
  if (user && profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-400 font-medium tracking-wide">Accessing Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin Portal</h1>
          <div className="flex items-center justify-center gap-2 text-surface-500 text-sm">
            <KeyRound className="w-3.5 h-3.5" />
            <span>MedVault — Restricted Access</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-surface-900/80 backdrop-blur-xl border border-surface-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">
              {isSignUp ? 'Create Admin Account' : 'Administrator Sign In'}
            </h2>
            <p className="text-surface-400 text-sm mt-1">
              {isSignUp ? 'Register a new administrator' : 'Enter your admin credentials'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Full Name - signup only */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 pl-10 text-sm bg-surface-800/60 border border-surface-700 rounded-xl placeholder-surface-500 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                    placeholder="Admin name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2.5 pl-10 text-sm bg-surface-800/60 border border-surface-700 rounded-xl placeholder-surface-500 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  placeholder="admin@medvault.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-2.5 pl-10 pr-10 text-sm bg-surface-800/60 border border-surface-700 rounded-xl placeholder-surface-500 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl shadow-md hover:shadow-violet-500/30 hover:from-violet-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-2 focus:ring-offset-surface-900"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isSignUp ? 'Create Admin Account' : 'Access Dashboard'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Toggle */}
            <p className="text-center text-sm text-surface-500 pt-2">
              {isSignUp ? 'Already registered?' : "Need an admin account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                {isSignUp ? 'Sign In' : 'Register'}
              </button>
            </p>
          </form>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center gap-2 mt-6 text-surface-600 text-xs">
          <Terminal className="w-3 h-3" />
          <span>This page is not indexed or linked publicly</span>
        </div>
      </div>
    </div>
  );
}
