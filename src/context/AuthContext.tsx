import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'doctor' | 'patient';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;         // true during initial session check
  profileLoading: boolean;  // true while profile is being fetched
  role: UserRole | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  role: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Simple profile fetch with retries
async function fetchUserProfile(userId: string, retries = 3): Promise<UserProfile | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) return data as UserProfile;
      
      // Wait before retry (except last attempt)
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  }
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // Use a flag that persists across the async operations in this effect
    let ignore = false;

    // Listen for ALL auth state changes including the initial session
    // Supabase v2 fires INITIAL_SESSION first, then subsequent events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignore) return;

        console.log('[Auth] event:', event, '| user:', session?.user?.email ?? 'none');

        const currentUser = session?.user ?? null;
        
        // Synchronously update user state first
        setUser(currentUser);

        if (currentUser) {
          setProfileLoading(true);
          // Use setTimeout to avoid Supabase deadlock with simultaneous requests
          // This is a known pattern recommended by Supabase docs
          setTimeout(async () => {
            if (ignore) return;
            const p = await fetchUserProfile(currentUser.id);
            if (!ignore) {
              setProfile(p);
              setProfileLoading(false);
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setProfileLoading(false);
          setLoading(false);
        }
      }
    );

    // Safety timeout: if nothing happens in 5 seconds, stop loading
    // This prevents infinite loading if Supabase is down
    const safetyTimer = setTimeout(() => {
      if (!ignore) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      ignore = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setProfile(null);
    setProfileLoading(false);
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      setProfileLoading(true);
      const p = await fetchUserProfile(user.id);
      setProfile(p);
      setProfileLoading(false);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      profileLoading,
      role: profile?.role || null,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
