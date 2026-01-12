import { useState, useEffect, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Toaster } from './components/ui/sonner.js';
import LoginForm from './components/auth/LoginForm.js';
import RegisterForm from './components/auth/RegisterForm.js';
import StudentDashboard from './components/dashboard/StudentDashboard.js';
import StaffDashboard from './components/dashboard/StaffDashboard.js';
import AdminDashboard from './components/admin/AdminDashboard.js';
import Navbar from './components/layout/Navbar.js';
import { supabase } from './lib/supabaseClient';

type UserRole = 'customer' | 'owner' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
  avatar?: string;
}

type Page =
  | 'login'
  | 'register'
  | 'dashboard'
  | 'menu'
  | 'orders'
  | 'payment'
  | 'profile'
  | 'manage-menu'
  | 'manage-orders'
  | 'queue-dashboard'
  | 'cafeteria-info'
  | 'cart-preview'
  | 'split-bill-initiation'
  | 'split-bill-tracking'
  | 'splitbill-invitations';

const ALLOWED_ADMIN_EMAILS = [
  'danialdev@gmail.com',
  'amandev@gmail.com',
  'thayaallandev@gmail.com',
  'mustaqimdev@gmail.com',
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zenith_last_page');
      return (saved as Page) || 'login';
    }
    return 'login';
  });
  const [cartCount, setCartCount] = useState(0);

  const normalizeRole = (role?: string | null): UserRole => {
    if (role === 'admin') return 'admin';
    if (role === 'owner' || role === 'staff') return 'owner';
    return 'customer';
  };

  // Normalize user with latest registration_request status
  const buildUserFromSession = async (session: Session | null) => {
    if (!session?.user) return null;
    const user = session.user;
    const emailLower = (user.email || '').toLowerCase();

    // Default role/status from auth metadata
    const rawRole =
      ALLOWED_ADMIN_EMAILS.includes(emailLower)
        ? 'admin'
        : (user.app_metadata?.role as string) ||
          (user.user_metadata?.role as string) ||
          'customer';
    let role: UserRole = normalizeRole(rawRole);
    let status =
      (user.app_metadata?.status as string) ||
      (user.user_metadata?.status as string) ||
      'active';

    // Pull latest registration_request status directly using auth ID
    console.log("Checking status for User ID:", user.id);
    // Note: In new schema, registration_request.user_id IS the auth user id.
    const { data: regRow, error: regErr } = await supabase
      .from('registration_request')
      .select('status, user_id')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .maybeSingle();

    console.log("Registration Look Result:", { regRow, regErr });

    if (regRow?.status) {
      role = role === 'admin' ? 'admin' : 'owner';
      status = regRow.status;
    }

    if (role === 'owner' && status === 'pending' && !regErr) {
      await supabase.auth.signOut();
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email || '',
      role,
      status,
    } as User;
  };

  // Sync currentPage to ref for use in auth listener
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Load Supabase session on mount
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      let session = data.session;

      // Validate session with server if it exists locally
      if (session) {
        const { data: userVerification, error: verificationError } = await supabase.auth.getUser();
        if (verificationError || !userVerification.user) {
           console.warn("Session found but server rejected token. Logging out.");
           await supabase.auth.signOut();
           session = null;
        }
      }

      const normalized = await buildUserFromSession(session || null);
      if (normalized) {
        setCurrentUser(normalized);
        const savedPage = localStorage.getItem('zenith_last_page') as Page | null;
        if (savedPage) {
            setCurrentPage(savedPage);
        } else {
            setCurrentPage('dashboard');
        }
      } else {
        setCurrentUser(null);
        setCurrentPage('login');
      }
    };

    loadSession();

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        (async () => {
          // Immediate check: If we are on the register page and a sign-in event occurs (auto-login),
          // we force sign-out and ignore the session to allow RegisterForm to handle the redirect.
          if (currentPageRef.current === 'register' && (event === 'SIGNED_IN' || session)) {
            if (session) {
                await supabase.auth.signOut();
            }
            return;
          }

          const normalized = await buildUserFromSession(session);
          if (normalized) {
            setCurrentUser(normalized);
            
            // Only redirect to dashboard on explicit sign in from a non-authenticated page
            // This prevents redirection if an unexpected SIGNED_IN fires while the user is browsing
            if (event === 'SIGNED_IN') {
              setCurrentPage((prev) => {
                  if (prev === 'login') {
                      return 'dashboard';
                  }
                  return prev;
              });
            }
          } else {
            setCurrentUser(null);
            setCurrentPage('login');
          }
        })();
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Save current page to local storage
  useEffect(() => {
    if (currentUser && currentPage !== 'login' && currentPage !== 'register') {
      localStorage.setItem('zenith_last_page', currentPage);
    }
  }, [currentPage, currentUser]);

  // Handle login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage('dashboard');
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentPage('login');
    localStorage.removeItem('zenith_last_page');
  };

  // After registration, redirect to login
  const handleRegister = () => {
    setCurrentPage('login');
    localStorage.removeItem('zenith_last_page');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {currentUser && (
        <Navbar
          user={currentUser}
          onLogout={handleLogout}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          cartCount={cartCount}
          onCartClick={() => setCurrentPage('cart-preview')}
        />
      )}

      <main className={currentUser ? 'pt-16' : ''}>
        {!currentUser ? (
          currentPage === 'login' ? (
            <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setCurrentPage('register')} />
          ) : (
            <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setCurrentPage('login')} />
          )
        ) : currentUser.role === 'admin' ? (
          <AdminDashboard user={currentUser} onLogout={handleLogout} />
        ) : currentUser.role === 'owner' ? (
          <StaffDashboard user={currentUser} currentPage={currentPage} onNavigate={setCurrentPage} />
        ) : (
          <StudentDashboard
            user={currentUser}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onCartCountChange={setCartCount}
          />
        )}
      </main>

      <Toaster />
    </div>
  );
}
