import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (name: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = `https://${projectId}.supabase.co`;
  const supabase = createClient(supabaseUrl, publicAnonKey);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        setUser(null);
      } else if (session?.user) {
        // Additional server-side verification for extra security
        const isValid = await verifySessionWithServer(session.access_token);
        
        if (isValid) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            user_metadata: session.user.user_metadata
          });
        } else {
          // Session invalid on server, sign out
          await supabase.auth.signOut();
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Error checking session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const verifySessionWithServer = async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/make-server-75f922d3/verify-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid === true;
      }
      
      return false;
    } catch (err) {
      console.error('Server verification error:', err);
      return false;
    }
  };

  const clearError = () => setError(null);

  const signUp = async (name: string, email: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 [AUTH] Sign up attempt:', { name, email });

      // Validate email format
      if (!emailRegex.test(email)) {
        console.log('❌ [AUTH] Invalid email format');
        throw new Error('Invalid email format');
      }

      if (!name || !email) {
        console.log('❌ [AUTH] Missing name or email');
        throw new Error('Name and email are required');
      }

      console.log('📡 [AUTH] Calling server signup endpoint...');

      // Call server to create user (passwordless)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-75f922d3/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('❌ [AUTH] Server error:', data.error);
        throw new Error(data.error || 'Signup failed');
      }

      console.log('✅ [AUTH] Signup successful');

      // Set user state
      setUser({
        id: data.user.id,
        email: data.user.email,
        user_metadata: { name }
      });

    } catch (err: any) {
      console.error('❌ [AUTH] Sign up failed:', err.message);
      setError(err.message || 'Sign up failed');
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 [AUTH] Sign in attempt:', email);

      // Validate email format BEFORE making API call
      if (!emailRegex.test(email)) {
        console.log('❌ [AUTH] Invalid email format');
        throw new Error('Invalid email format');
      }

      if (!email) {
        console.log('❌ [AUTH] Missing email');
        throw new Error('Email is required');
      }

      console.log('📡 [AUTH] Calling server signin endpoint...');

      // Call server to sign in (passwordless)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-75f922d3/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('❌ [AUTH] Server error:', data.error);
        throw new Error(data.error || 'Sign in failed');
      }

      // CRITICAL: Only set user if we have valid data
      if (!data.user) {
        console.log('❌ [AUTH] No user returned - LOGIN BLOCKED');
        throw new Error('Authentication failed - no valid user');
      }

      console.log('✅ [AUTH] Login successful - setting user state');
      setUser({
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata
      });

    } catch (err: any) {
      console.error('❌ [AUTH] Sign in failed:', err.message);
      setError(err.message || 'Sign in failed');
      setUser(null); // CRITICAL: Ensure user is NULL on error
      throw err; // Re-throw to prevent navigation
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔐 [AUTH] Google Sign in attempt');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('❌ [AUTH] Google Sign in failed:', err.message);
      setError(err.message || 'Google Sign in failed');
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signUp, signOut, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}