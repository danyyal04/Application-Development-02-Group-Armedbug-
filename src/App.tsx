import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner.js';
import LoginForm from './components/auth/LoginForm.js';
import RegisterForm from './components/auth/RegisterForm.js';
import StudentDashboard from './components/dashboard/StudentDashboard.js';
import StaffDashboard from './components/dashboard/StaffDashboard.js';
import Navbar from './components/layout/Navbar.js';
import { supabase } from './lib/supabaseClient';

type UserRole = 'student' | 'staff' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  | 'manage-orders';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('login');

  // Load Supabase session on mount
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const user = data.session.user;
        setCurrentUser({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email || '',
          role: user.user_metadata?.role || 'student',
        });
        setCurrentPage('dashboard');
      }
    };

    loadSession();

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        setCurrentUser({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email || '',
          role: user.user_metadata?.role || 'student',
        });
        setCurrentPage('dashboard');
      } else {
        setCurrentUser(null);
        setCurrentPage('login');
      }
    });

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
        />
      )}

      <main className={currentUser ? 'pt-16' : ''}>
        {!currentUser ? (
          currentPage === 'login' ? (
            <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setCurrentPage('register')} />
          ) : (
            <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setCurrentPage('login')} />
          )
        ) : currentUser.role === 'staff' ? (
          <StaffDashboard user={currentUser} currentPage={currentPage} onNavigate={setCurrentPage} />
        ) : (
          <StudentDashboard user={currentUser} currentPage={currentPage} onNavigate={setCurrentPage} />
        )}
      </main>

      <Toaster />
    </div>
  );
}
