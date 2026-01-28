import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/services/socketService';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

// Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Discover } from '@/pages/Discover';
import { Matches } from '@/pages/Matches';
import { Messages } from '@/pages/Messages';
import { Filter } from '@/pages/Filter';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';
import { Subscription } from '@/pages/Subscription';

import '@/styles/index.css';

// Composant interne pour utiliser le hook d'inactivité (doit être dans BrowserRouter)
function AppContent() {
  const { isAuthenticated, checkAuth, isLoading, presenceMode } = useAuthStore();

  // Timeout d'inactivité : 1 minute (doit être appelé dans BrowserRouter)
  useInactivityTimeout(1);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && presenceMode !== 'offline') {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, isLoading, presenceMode]);

  return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pb-20 md:pb-0">
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/discover" replace /> : <Login />
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? <Navigate to="/discover" replace /> : <Register />
              }
            />
            <Route
              path="/forgot-password"
              element={
                isAuthenticated ? <Navigate to="/discover" replace /> : <ForgotPassword />
              }
            />
            <Route
              path="/discover"
              element={
                <ProtectedRoute>
                  <Discover />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <Matches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/filter"
              element={
                <ProtectedRoute>
                  <Filter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="*" element={<Navigate to="/discover" replace />} />
          </Routes>
        </main>
        <BottomNav />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#F26E27',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

