import { useState, useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Toaster } from './components/ui/sonner.js';
import LoginForm from './components/auth/LoginForm.js';
import RegisterForm from './components/auth/RegisterForm.js';
import StudentDashboard from './components/dashboard/StudentDashboard.js';
import StaffDashboard from './components/dashboard/StaffDashboard.js';
import AdminDashboard from './components/admin/AdminDashboard.js';
import Navbar from './components/layout/Navbar.js';
import { supabase } from './lib/supabaseClient';

type UserRole = 'student' | 'staff' | 'admin';

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
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [cartCount, setCartCount] = useState(0);

  // Normalize user with latest registration_request status
  const buildUserFromSession = async (session: Session | null) => {
    if (!session?.user) return null;
    const user = session.user;
    const emailLower = (user.email || '').toLowerCase();

    // Default role/status from auth metadata
    let role: UserRole =
      ALLOWED_ADMIN_EMAILS.includes(emailLower)
        ? 'admin'
        : (user.app_metadata?.role as UserRole) ||
          (user.user_metadata?.role as UserRole) ||
          'student';
    let status =
      (user.app_metadata?.status as string) ||
      (user.user_metadata?.status as string) ||
      'active';

    // Pull latest registration_request to avoid stale metadata (e.g., after admin approves)
    const { data: regRow } = await supabase
      .from('registration_request')
      .select('status')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (regRow?.status) {
      role = role === 'admin' ? 'admin' : 'staff';
      status = regRow.status;
    }

    if (role === 'staff' && status === 'pending') {
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

  // Load Supabase session on mount
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const normalized = await buildUserFromSession(data.session || null);
      if (normalized) {
        setCurrentUser(normalized);
        setCurrentPage('dashboard');
      } else {
        setCurrentUser(null);
        setCurrentPage('login');
      }
    };

    loadSession();

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        (async () => {
          const normalized = await buildUserFromSession(session);
          if (normalized) {
            setCurrentUser(normalized);
            setCurrentPage('dashboard');
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
  };

  // After registration, redirect to login
  const handleRegister = () => {
    setCurrentPage('login');
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
        ) : currentUser.role === 'staff' ? (
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
