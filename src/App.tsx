import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner.js';
import LoginForm from './components/auth/LoginForm.js';
import RegisterForm from './components/auth/RegisterForm.js';
import StudentDashboard from './components/dashboard/StudentDashboard.js';
import StaffDashboard from './components/dashboard/StaffDashboard.js';
import Navbar from './components/layout/Navbar.js';

type UserRole = 'student' | 'staff' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

type Page = 'login' | 'register' | 'dashboard' | 'menu' | 'orders' | 'payment' | 'profile' | 'manage-menu' | 'manage-orders';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('login');

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
  };

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
            <LoginForm 
              onLogin={handleLogin}
              onSwitchToRegister={() => setCurrentPage('register')}
            />
          ) : (
            <RegisterForm
              onRegister={handleRegister}
              onSwitchToLogin={() => setCurrentPage('login')}
            />
          )
        ) : currentUser.role === 'staff' ? (
          <StaffDashboard 
            user={currentUser}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
          />
        ) : (
          <StudentDashboard 
            user={currentUser}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
          />
        )}
      </main>

      <Toaster />
    </div>
  );
}
